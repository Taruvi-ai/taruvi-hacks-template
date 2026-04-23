import { useList, useShow } from "@refinedev/core";
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import { Link, useParams } from "react-router";
import { formatCurrency } from "../../utils/formatCurrency";

export const BouquetShow = () => {
  const params = useParams();
  const id = params.id ?? "";
  const { result } = useShow({
    resource: "bouquets",
    id,
  });

  const relatedOrders = useList({
    resource: "order_items",
    pagination: { pageSize: 10 },
    filters: [{ field: "bouquet_id", operator: "eq", value: id }],
  });

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "rgba(255,255,255,0.86)",
            border: "1px solid rgba(138, 101, 83, 0.08)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Box
              sx={{
                width: { xs: "100%", md: 360 },
                minHeight: 320,
                borderRadius: 4,
                backgroundImage: `url(${result?.image_url || ""})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <Stack spacing={2} sx={{ flex: 1 }}>
              <Chip label={result?.occasion || "Bouquet"} sx={{ borderRadius: 999, alignSelf: "flex-start" }} />
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
                  Bouquet detail
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 700 }}>
                  {result?.name}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mt: 1, fontWeight: 400 }}>
                  {result?.subtitle}
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {result?.description}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={formatCurrency(result?.price_cents)} color="secondary" sx={{ borderRadius: 999 }} />
                <Chip label={`${result?.stem_count || 0} stems`} sx={{ borderRadius: 999 }} />
                <Chip label={result?.size || "Size"} sx={{ borderRadius: 999 }} />
                <Chip label={result?.featured ? "Featured" : "Standard"} sx={{ borderRadius: 999 }} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <Button component={Link} to={`/bouquets/edit/${id}`} variant="contained" sx={{ borderRadius: 999 }}>
                  Edit bouquet
                </Button>
                <Button component={Link} to="/bouquets" variant="outlined" sx={{ borderRadius: 999 }}>
                  Back to catalog
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.86)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Product notes
              </Typography>
              <Stack spacing={1.25}>
                <Typography color="text.secondary">Color story: {result?.color_story}</Typography>
                <Typography color="text.secondary">Accent color: {result?.accent_color}</Typography>
                <Typography color="text.secondary">Stock: {result?.stock_quantity ?? 0}</Typography>
                <Typography color="text.secondary">In stock: {result?.in_stock ? "Yes" : "No"}</Typography>
                <Typography color="text.secondary">Care notes: {result?.care_notes}</Typography>
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.86)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Order activity
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Recent order lines that include this bouquet.
              </Typography>
              <Stack spacing={1.25}>
                {(relatedOrders.result.data ?? []).map((item: Record<string, unknown>) => (
                  <Paper key={String(item.id)} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                    <Typography sx={{ fontWeight: 700 }}>Order line {String(item.id).slice(0, 8)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quantity: {String(item.quantity || 1)} · Line total: {formatCurrency(Number(item.line_total_cents || 0))}
                    </Typography>
                  </Paper>
                ))}
                {(relatedOrders.result.data ?? []).length === 0 && (
                  <Typography color="text.secondary">No orders yet for this bouquet.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};
