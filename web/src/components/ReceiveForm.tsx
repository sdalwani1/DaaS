"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useReceivePurchaseOrderMutation, useGetLocationsQuery, type PurchaseOrder } from "@/store/purchaseOrdersApi";

const schema = z.object({
  locationId: z.string().min(1, "Pick a location"),
  qty: z.coerce.number().int().positive("Must be at least 1"),
});

type FormValues = z.infer<typeof schema>;

export function ReceiveForm({ po, lineId, remaining }: { po: PurchaseOrder; lineId: string; remaining: number }) {
  const { data: locations } = useGetLocationsQuery();
  const [receivePurchaseOrder, { isLoading }] = useReceivePurchaseOrderMutation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { locationId: "", qty: remaining },
    });

  const onSubmit = async (values: z.output<typeof schema>) => {
    setError(null);
    setSuccess(false);
    try {
      await receivePurchaseOrder({
        purchaseOrderId: po.id,
        idempotencyKey: crypto.randomUUID(),
        lines: [{ lineId, qty: values.qty, locationId: values.locationId }],
      }).unwrap();
      setSuccess(true);
      reset({ locationId: values.locationId, qty: 0 });
    } catch (err) {
      console.error(err);
      setError("Failed to receive. Check the quantity and try again.");
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", py: 1 }}>
        <TextField
            select
            label="Location"
            size="small"
            sx={{ minWidth: 140 }}
            {...register("locationId")}
            error={!!errors.locationId}
            helperText={errors.locationId?.message}
            defaultValue=""
        >
            {locations?.map((loc) => (
            <MenuItem key={loc.id} value={loc.id}>
                {loc.code}
            </MenuItem>
            ))}
        </TextField>

        <TextField
            label={`Qty (max ${remaining})`}
            type="number"
            size="small"
            sx={{ width: 140 }}
            {...register("qty")}
            error={!!errors.qty}
            helperText={errors.qty?.message}
        />

        <Button type="submit" variant="outlined" disabled={isLoading || remaining === 0}>
            {isLoading ? "Receiving..." : "Receive"}
        </Button>

        {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ py: 0 }}>Received!</Alert>}
        </Stack>
    </form>
    );
}