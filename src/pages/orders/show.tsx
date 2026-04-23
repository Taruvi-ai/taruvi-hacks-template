import { useList, useShow } from "@refinedev/core";
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import { Link, useParams } from "react-router";
import { formatCurrency } from "../../utils/formatCurrency";

export const OrderShow = () => {
  const params = useParams();
  const id = params.id ?? "";
  const { result } = useShow({
    resource: "orders",
    id,
    meta: { populate: ["customer_id"] },
  });

  const orderItems = useList({
    resource: "order_items",
    pagination: { pageSize: 20 },
    filters: [{ field: "order_id", operator: "eq", value: id }],
    meta: { populate: ["bouquet_id"] },
  });
  const order = result as any;
  const rows = (orderItems.result.data ?? []) as any[];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.86)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
                Order detail
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 700 }}>
                {order?.order_number || "Order"}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {order?.customer_id?.full_name || order?.recipient_name || "Customer"}
              </Typography>
            </Box>
            <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                <Chip label={order?.status || "pending"} sx={{ borderRadius: 999 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatCurrency(order?.total_cents)}
                </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.86)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Fulfillment and delivery
          </Typography>
          <Stack spacing={1}>
            <Typography color="text.secondary">Fulfillment: {order?.fulfillment_type}</Typography>
            <Typography color="text.secondary">Delivery window: {order?.delivery_window || "—"}</Typography>
            <Typography color="text.secondary">Delivery date: {order?.delivery_date || "—"}</Typography>
            <Typography color="text.secondary">Delivery address: {order?.delivery_address || "—"}</Typography>
            <Typography color="text.secondary">City: {order?.city || "—"}, {order?.state || "—"} {order?.postal_code || ""}</Typography>
            <Typography color="text.secondary">Recipient message: {order?.recipient_message || "—"}</Typography>
            <Typography color="text.secondary">Notes: {order?.notes || "—"}</Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.86)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Items
          </Typography>
          <Stack spacing={2}>
            {rows.map((item) => (
              <Paper key={String(item.id)} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.bouquet_id?.name || "Bouquet item"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.quantity} x {formatCurrency(Number(item.unit_price_cents || 0))}
                    </Typography>
                  </Box>
                  <Stack alignItems={{ xs: "flex-start", md: "flex-end" }}>
                    <Typography sx={{ fontWeight: 700 }}>{formatCurrency(Number(item.line_total_cents || 0))}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.special_wrap ? "Gift wrap included" : "No gift wrap"}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
            {rows.length === 0 && (
              <Typography color="text.secondary">This order has no line items.</Typography>
            )}
          </Stack>
          <Divider sx={{ my: 2.5 }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={Link} to={`/orders/edit/${id}`} variant="contained" sx={{ borderRadius: 999 }}>
              Edit order
            </Button>
            <Button component={Link} to="/orders" variant="outlined" sx={{ borderRadius: 999 }}>
              Back to orders
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};
