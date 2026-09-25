import { readFileSync } from "node:fs";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { verifyToken, type AuthUser } from "./platform/auth.js";
import { purchaseOrderResolvers } from "./modules/purchase-orders/resolvers.js";

export type GraphQLContext = {
  user: AuthUser | null;
};

const typeDefs = readFileSync(
  new URL("./modules/purchase-orders/schema.graphql", import.meta.url),
  "utf-8"
);

const resolvers = {
  Query: { ...purchaseOrderResolvers.Query },
  Mutation: { ...purchaseOrderResolvers.Mutation },
};

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT) || 4000 },
  context: async ({ req }) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const user = token ? await verifyToken(token) : null;
    return { user };
  },
});

console.log(`API ready at ${url}`);