import { pgTable, uuid, text, timestamp, integer, numeric, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// every table gets these
const base = {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const vendors = pgTable("vendors", {
  ...base,
  name: text("name").notNull(),
}, (t) => [
  uniqueIndex("vendors_name_unique").on(t.name).where(sql`${t.deletedAt} is null`),
]);

export const products = pgTable("products", {
  ...base,
  sku: text("sku").notNull(),
  name: text("name").notNull(),
}, (t) => [
  uniqueIndex("products_sku_unique").on(t.sku).where(sql`${t.deletedAt} is null`),
]);

export const locations = pgTable("locations", {
  ...base,
  code: text("code").notNull(),
  name: text("name").notNull(),
}, (t) => [
  uniqueIndex("locations_code_unique").on(t.code).where(sql`${t.deletedAt} is null`),
]);

export const purchaseOrders = pgTable("purchase_orders", {
  ...base,
  poNumber: text("po_number").notNull(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  notes: text("notes"),
}, (t) => [
  uniqueIndex("po_number_unique").on(t.poNumber).where(sql`${t.deletedAt} is null`),
]);

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  ...base,
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qtyOrdered: integer("qty_ordered").notNull(),
  qtyReceived: integer("qty_received").notNull().default(0),
}, (t) => [
  check("qty_ordered_positive", sql`${t.qtyOrdered} > 0`),
  check("qty_received_range", sql`${t.qtyReceived} >= 0 AND ${t.qtyReceived} <= ${t.qtyOrdered}`),
]);

export const stockMovements = pgTable("stock_movements", {
  ...base,
  productId: uuid("product_id").notNull().references(() => products.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  type: text("type").notNull(), // 'receive' for now
  qtyDelta: integer("qty_delta").notNull(),
  poLineId: uuid("po_line_id").references(() => purchaseOrderLines.id),
  idempotencyKey: text("idempotency_key"),
  createdBy: text("created_by").notNull(),
}, (t) => [
  check("qty_delta_nonzero", sql`${t.qtyDelta} <> 0`),
  uniqueIndex("stock_movements_idempotency_unique").on(t.idempotencyKey).where(sql`${t.idempotencyKey} is not null`),
]);

export const stockLevels = pgTable("stock_levels", {
  ...base,
  productId: uuid("product_id").notNull().references(() => products.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  onHand: integer("on_hand").notNull().default(0),
}, (t) => [
  uniqueIndex("stock_levels_product_location_unique").on(t.productId, t.locationId),
  check("on_hand_nonnegative", sql`${t.onHand} >= 0`),
]);