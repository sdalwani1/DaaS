import * as service from "./service.js";
import type { GraphQLContext } from "../../server.js";

export const purchaseOrderResolvers = {
  Query: {
    purchaseOrders: (_p: unknown, args: { status?: service.PurchaseOrderStatus }, _ctx: GraphQLContext) =>
      service.getPurchaseOrders(args.status),
    purchaseOrder: (_p: unknown, args: { id: string }, _ctx: GraphQLContext) =>
      service.getPurchaseOrder(args.id),
  },
  Mutation: {
    createPurchaseOrder: (_p: unknown, args: { input: Parameters<typeof service.createPurchaseOrder>[0] }, _ctx: GraphQLContext) =>
      service.createPurchaseOrder(args.input),
  },
};