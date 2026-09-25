"use client";

import { api } from "./apiSlice";

export type PurchaseOrderStatus = "OPEN" | "PARTIAL" | "RECEIVED";

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  vendor: { name: string };
  lines: { id: string; qtyOrdered: number; qtyReceived: number; product: { sku: string; name: string } }[];
};

const purchaseOrdersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPurchaseOrders: build.query<PurchaseOrder[], PurchaseOrderStatus | undefined>({
      query: (status) => ({
        query: `
          query PurchaseOrders($status: PurchaseOrderStatus) {
            purchaseOrders(status: $status) {
              id
              poNumber
              status
              vendor { name }
              lines { id qtyOrdered qtyReceived product { sku name } }
            }
          }
        `,
        variables: { status },
      }),
      transformResponse: (response: { purchaseOrders: PurchaseOrder[] }) => response.purchaseOrders,
      providesTags: ["PurchaseOrder"],
    }),
    createPurchaseOrder: build.mutation<PurchaseOrder, {
        poNumber: string;
        vendorId: string;
        notes?: string;
        lines: { productId: string; qtyOrdered: number }[];
        }>({
            query: (input) => ({
                query: `
                mutation CreatePurchaseOrder($input: CreatePurchaseOrderInput!) {
                    createPurchaseOrder(input: $input) {
                    id
                    poNumber
                    status
                    vendor { name }
                    lines { id qtyOrdered qtyReceived product { sku name } }
                    }
                }
                `,
                variables: { input },
            }),
        transformResponse: (response: { createPurchaseOrder: PurchaseOrder }) => response.createPurchaseOrder,
        invalidatesTags: ["PurchaseOrder"],
    }),
    getVendors: build.query<{ id: string; name: string }[], void>({
    query: () => ({
        query: `query { vendors { id name } }`,
    }),
    transformResponse: (response: { vendors: { id: string; name: string }[] }) => response.vendors,
    }),
    getProducts: build.query<{ id: string; sku: string; name: string }[], void>({
    query: () => ({
        query: `query { products { id sku name } }`,
    }),
    transformResponse: (response: { products: { id: string; sku: string; name: string }[] }) => response.products,
    }),
  }),
});

export const { useGetPurchaseOrdersQuery, useCreatePurchaseOrderMutation, useGetVendorsQuery, useGetProductsQuery } = purchaseOrdersApi;

