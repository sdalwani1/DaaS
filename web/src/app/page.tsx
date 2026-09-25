"use client";

import { Alert, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useGetPurchaseOrdersQuery, type PurchaseOrderStatus } from "@/store/purchaseOrdersApi";

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
                <TableCell>{po.poNumber}</TableCell>
                <TableCell>{po.vendor.name}</TableCell>
                <TableCell>
                  <Chip label={po.status} color={statusColor[po.status]} size="small" />
                </TableCell>
                <TableCell>{po.lines.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}