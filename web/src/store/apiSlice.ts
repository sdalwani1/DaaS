"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const graphqlBaseQuery =
  () =>
  async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
    const raw = fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL });
    const result = await raw(
      {
        url: "",
        method: "POST",
        body: { query, variables },
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEV_TOKEN}` },
      },
      {} as never,
      {}
    );

    if (result.error) return { error: result.error };

    const body = result.data as { data?: unknown; errors?: { message: string }[] };
    if (body.errors?.length) {
      return { error: { status: "CUSTOM_ERROR", error: body.errors[0].message } };
    }
    return { data: body.data };
  };

export const api = createApi({
  reducerPath: "api",
  baseQuery: graphqlBaseQuery(),
  tagTypes: ["PurchaseOrder"],
  endpoints: () => ({}),
});