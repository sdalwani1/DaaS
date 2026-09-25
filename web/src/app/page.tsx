"use client";

import { Alert, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Button } from "@mui/material";
import { useGetPurchaseOrdersQuery, type PurchaseOrderStatus } from "@/store/purchaseOrdersApi";
import Link from "next/link";
import { ReceiveForm } from "@/components/ReceiveForm";

const statusColor: Record<PurchaseOrderStatus, "warning" | "info" | "success"> = {
  OPEN: "warning",
  PARTIAL: "info",
  RECEIVED: "success",
};

export default function Home() {
  const { data: purchaseOrders, isLoading, error } = useGetPurchaseOrdersQuery(undefined);

  return (
    <Stack spacing={3} sx={{ p: 4 }}>
      <Typography variant="h4">Purchase Orders</Typography>
      <Button component={Link} href="/purchase-orders/new" variant="contained">
        New Purchase Order
      </Button>

      {isLoading && <CircularProgress />}

      {error && <Alert severity="error">Failed to load purchase orders. Is the API running?</Alert>}

      {purchaseOrders && purchaseOrders.length === 0 && (
        <Alert severity="info">No purchase orders yet.</Alert>
      )}

      {purchaseOrders && purchaseOrders.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PO Number</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Lines</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell sx={{ verticalAlign: "top" }}>{po.poNumber}</TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>{po.vendor.name}</TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>
                  <Chip label={po.status} color={statusColor[po.status]} size="small" />
                </TableCell>
                <TableCell>
                  <Stack spacing={1}>
                    {po.lines.map((line) => {
                      const remaining = line.qtyOrdered - line.qtyReceived;
                      return (
                        <Stack key={line.id} spacing={0.5}>
                          <Typography variant="body2">
                            {line.product.sku} — {line.qtyReceived}/{line.qtyOrdered} received
                          </Typography>
                          {remaining > 0 && <ReceiveForm po={po} lineId={line.id} remaining={remaining} />}
                        </Stack>
                      );
                    })}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}