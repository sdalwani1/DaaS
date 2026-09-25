import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { verifyToken, type AuthUser } from "./platform/auth.js";

export type GraphQLContext = {
  user: AuthUser | null;
};

const typeDefs = `#graphql
  type Query {
    hello: String
    me: String
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello from the DaaS API",
    me: (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.user) return "Not logged in";
      return `You are ${context.user.userId}, role: ${context.user.role}`;
    },
  },
};

const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT) || 4000 },
  context: async ({ req }) => {
    const authHeader = req.headers.authorization; // "Bearer <token>"
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const user = token ? await verifyToken(token) : null;
    return { user };
  },
});

console.log(`API ready at ${url}`);