import { eq, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { purchaseOrders, purchaseOrderLines, vendors, products } from "../../db/schema.js";

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