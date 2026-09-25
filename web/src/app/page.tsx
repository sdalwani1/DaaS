import { Button, Chip, Stack, Typography } from "@mui/material";

export default function Home() {
  return (
    <Stack spacing={2} sx={{ p: 4 }}>
      <Typography variant="h4">DaaS Inventory</Typography>
      <Stack direction="row" spacing={1}>
        <Chip label="OPEN" color="warning" />
        <Chip label="PARTIAL" color="info" />
        <Chip label="RECEIVED" color="success" />
      </Stack>
      <Button variant="contained">Test Button</Button>
    </Stack>
  );
}