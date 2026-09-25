import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { purchaseOrders, purchaseOrderLines, vendors, products, stockMovements, stockLevels, locations } from "../../db/schema.js";

export async function listPurchaseOrders() {
  return db.query.purchaseOrders.findMany({
    where: isNull(purchaseOrders.deletedAt),
    with: { vendor: true, lines: { with: { product: true } } },
  });
}

export async function findPurchaseOrderById(id: string) {
  return db.query.purchaseOrders.findFirst({
    where: eq(purchaseOrders.id, id),
    with: { vendor: true, lines: { with: { product: true } } },
  });
}

export async function insertPurchaseOrder(input: {
  poNumber: string;
  vendorId: string;
  notes?: string | null;
  lines: { productId: string; qtyOrdered: number }[];
}) {
  return db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrders)
      .values({ poNumber: input.poNumber, vendorId: input.vendorId, notes: input.notes })
      .returning();

    await tx.insert(purchaseOrderLines).values(
      input.lines.map((line) => ({
        purchaseOrderId: po.id,
        productId: line.productId,
        qtyOrdered: line.qtyOrdered,
      }))
    );

    return po.id;
  });
}

export async function receiveLines(input: {
  purchaseOrderId: string;
  idempotencyKey: string;
  createdBy: string;
  lines: { lineId: string; qty: number; locationId: string }[];
}) {
  return db.transaction(async (tx) => {
    const lineIds = input.lines.map((l) => l.lineId);

    // 1. Lock the PO lines, in a fixed order (sorted by id) to avoid deadlocks
    //    when two transactions lock overlapping lines in different orders.
    const lockedLines = await tx
      .select()
      .from(purchaseOrderLines)
      .where(and(eq(purchaseOrderLines.purchaseOrderId, input.purchaseOrderId), inArray(purchaseOrderLines.id, lineIds)))
      .orderBy(purchaseOrderLines.id)
      .for("update");

    const lineMap = new Map(lockedLines.map((l) => [l.id, l]));

    // 2. Validate every line before writing anything
    for (const req of input.lines) {
      const line = lineMap.get(req.lineId);
      if (!line) throw new Error(`Line ${req.lineId} not found on this PO`);
      if (req.qty <= 0) throw new Error(`Quantity must be positive`);
      const remaining = line.qtyOrdered - line.qtyReceived;
      if (req.qty > remaining) {
        throw new Error(`Cannot receive ${req.qty}, only ${remaining} remaining on line ${req.lineId}`);
      }
    }

    // 3. Insert one stock_movement per line. If idempotencyKey was already used,
    //    onConflictDoNothing means this insert silently does nothing (a replay).
    const inserted = await tx
      .insert(stockMovements)
      .values(
        input.lines.map((req) => ({
          productId: lineMap.get(req.lineId)!.productId,
          locationId: req.locationId,
          type: "receive",
          qtyDelta: req.qty,
          poLineId: req.lineId,
          idempotencyKey: `${input.idempotencyKey}:${req.lineId}`,
          createdBy: input.createdBy,
        }))
      )
      .onConflictDoNothing({
        target: stockMovements.idempotencyKey,
        where: sql`${stockMovements.idempotencyKey} is not null`,
      })
      .returning();

    // 4. If nothing was inserted, this whole request is a replay — stop here,
    //    don't double-count stock levels or received quantities.
    if (inserted.length === 0) {
      return input.purchaseOrderId;
    }

    // 5. For each successfully inserted movement, bump stock_levels and qty_received
    for (const movement of inserted) {
      await tx
        .insert(stockLevels)
        .values({ productId: movement.productId, locationId: movement.locationId, onHand: movement.qtyDelta })
        .onConflictDoUpdate({
          target: [stockLevels.productId, stockLevels.locationId],
          set: { onHand: sql`${stockLevels.onHand} + ${movement.qtyDelta}` },
        });

      await tx
        .update(purchaseOrderLines)
        .set({ qtyReceived: sql`${purchaseOrderLines.qtyReceived} + ${movement.qtyDelta}` })
        .where(eq(purchaseOrderLines.id, movement.poLineId!));
    }

    return input.purchaseOrderId;
  });
}

export async function listVendors() {
  return db.query.vendors.findMany({ where: isNull(vendors.deletedAt) });
}

export async function listProducts() {
  return db.query.products.findMany({ where: isNull(products.deletedAt) });
}

export async function listLocations() {
  return db.query.locations.findMany({ where: isNull(locations.deletedAt) });
}