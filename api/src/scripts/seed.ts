import { db } from "../db/client.js";
import { vendors, products, locations } from "../db/schema.js";

const [acme] = await db.insert(vendors).values({ name: "Acme AV Supply" }).returning();
const [beta] = await db.insert(vendors).values({ name: "Beta Electronics" }).returning();

const [speaker] = await db.insert(products).values({ sku: "SPK-100", name: "Ceiling Speaker" }).returning();
const [screen] = await db.insert(products).values({ sku: "SCR-200", name: "75in Display" }).returning();

const [warehouseA] = await db.insert(locations).values({ code: "WH-A", name: "Warehouse A" }).returning();
const [warehouseB] = await db.insert(locations).values({ code: "WH-B", name: "Warehouse B" }).returning();

console.log("Seeded:", {
  vendors: [acme.name, beta.name],
  products: [speaker.sku, screen.sku],
  locations: [warehouseA.code, warehouseB.code],
});

process.exit(0);