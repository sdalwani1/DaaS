"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Alert, Button, IconButton, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useCreatePurchaseOrderMutation, useGetVendorsQuery, useGetProductsQuery } from "@/store/purchaseOrdersApi";

const schema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  vendorId: z.string().min(1, "Pick a vendor"),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "Pick a product"),
        qtyOrdered: z.coerce.number().int().positive("Must be at least 1"),
      })
    )
    .min(1, "Add at least one line"),
});

type FormValues = z.infer<typeof schema>;

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { data: vendors } = useGetVendorsQuery();
  const { data: products } = useGetProductsQuery();
  const [createPurchaseOrder, { isLoading }] = useCreatePurchaseOrderMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { poNumber: "", vendorId: "", lines: [{ productId: "", qtyOrdered: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      await createPurchaseOrder(values).unwrap();
      router.push("/");
    } catch (err) {
      setSubmitError("Failed to create purchase order. Please try again.");
    }
  };

  return (
    <Stack spacing={3} sx={{ p: 4, maxWidth: 600 }} component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h4">New Purchase Order</Typography>

      {submitError && <Alert severity="error">{submitError}</Alert>}

      <TextField
        label="PO Number"
        {...register("poNumber")}
        error={!!errors.poNumber}
        helperText={errors.poNumber?.message}
      />

      <TextField
        select
        label="Vendor"
        {...register("vendorId")}
        error={!!errors.vendorId}
        helperText={errors.vendorId?.message}
        defaultValue=""
      >
        {vendors?.map((v) => (
          <MenuItem key={v.id} value={v.id}>
            {v.name}
          </MenuItem>
        ))}
      </TextField>

      <Typography variant="h6">Lines</Typography>

      {fields.map((field, index) => (
        <Stack direction="row" spacing={2} key={field.id} alignItems="flex-start">
          <TextField
            select
            label="Product"
            sx={{ flex: 2 }}
            {...register(`lines.${index}.productId`)}
            error={!!errors.lines?.[index]?.productId}
            helperText={errors.lines?.[index]?.productId?.message}
            defaultValue=""
          >
            {products?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.sku} — {p.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Qty"
            type="number"
            sx={{ flex: 1 }}
            {...register(`lines.${index}.qtyOrdered`)}
            error={!!errors.lines?.[index]?.qtyOrdered}
            helperText={errors.lines?.[index]?.qtyOrdered?.message}
          />

          <IconButton onClick={() => remove(index)} disabled={fields.length === 1}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}

      <Button startIcon={<AddIcon />} onClick={() => append({ productId: "", qtyOrdered: 1 })} sx={{ alignSelf: "flex-start" }}>
        Add line
      </Button>

      <Button type="submit" variant="contained" disabled={isLoading} sx={{ alignSelf: "flex-start" }}>
        {isLoading ? "Creating..." : "Create Purchase Order"}
      </Button>
    </Stack>
  );
}