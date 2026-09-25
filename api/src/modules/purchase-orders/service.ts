import * as dbLayer from "./db.js";

export type PurchaseOrderStatus = "OPEN" | "PARTIAL" | "RECEIVED";

function computeStatus(lines: { qtyOrdered: number; qtyReceived: number }[]): PurchaseOrderStatus {
  const totalReceived = lines.reduce((sum, l) => sum + l.qtyReceived, 0);
  if (totalReceived === 0) return "OPEN";
  const fullyReceived = lines.every((l) => l.qtyReceived === l.qtyOrdered);
  return fullyReceived ? "RECEIVED" : "PARTIAL";
}

export async function getPurchaseOrders(statusFilter?: PurchaseOrderStatus) {
  const pos = await dbLayer.listPurchaseOrders();
  const withStatus = pos.map((po) => ({ ...po, status: computeStatus(po.lines) }));
  return statusFilter ? withStatus.filter((po) => po.status === statusFilter) : withStatus;
}

export async function getPurchaseOrder(id: string) {
  const po = await dbLayer.findPurchaseOrderById(id);
  if (!po) return null;
  return { ...po, status: computeStatus(po.lines) };
}

export async function createPurchaseOrder(input: {
  poNumber: string;
  vendorId: string;
  notes?: string | null;
  lines: { productId: string; qtyOrdered: number }[];
}) {
  if (input.lines.length === 0) {
    throw new Error("A purchase order needs at least one line");
  }
  const id = await dbLayer.insertPurchaseOrder(input);
  return getPurchaseOrder(id);
}

export async function receivePurchaseOrder(
  input: {
    purchaseOrderId: string;
    idempotencyKey: string;
    lines: { lineId: string; qty: number; locationId: string }[];
  },
  actingUser: { userId: string; role: string }
) {
  if (actingUser.role !== "warehouse" && actingUser.role !== "admin") {
    throw new Error("FORBIDDEN: only warehouse or admin can receive stock");
  }
  const poId = await dbLayer.receiveLines({ ...input, createdBy: actingUser.userId });
  return getPurchaseOrder(poId);
}