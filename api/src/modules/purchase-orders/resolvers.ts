import * as service from "./service.js";
import type { GraphQLContext } from "../../server.js";

export const purchaseOrderResolvers = {
  Query: {
    purchaseOrders: (_p: unknown, args: { status?: service.PurchaseOrderStatus }, _ctx: GraphQLContext) =>
      service.getPurchaseOrders(args.status),
    purchaseOrder: (_p: unknown, args: { id: string }, _ctx: GraphQLContext) =>
      service.getPurchaseOrder(args.id),
    vendors: () => service.getVendors(),
    products: () => service.getProducts(),
  },
  Mutation: {
    createPurchaseOrder: (_p: unknown, args: { input: Parameters<typeof service.createPurchaseOrder>[0] }, _ctx: GraphQLContext) =>
      service.createPurchaseOrder(args.input),
    receivePurchaseOrder: (_p: unknown, args: { input: Parameters<typeof service.receivePurchaseOrder>[0] }, ctx: GraphQLContext) => {
      if (!ctx.user) throw new Error("UNAUTHENTICATED");
      return service.receivePurchaseOrder(args.input, ctx.user);
    },
  },
};