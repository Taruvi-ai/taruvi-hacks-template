import { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import RoseRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import { useList, useNotification, type CrudFilters } from "@refinedev/core";
import { keyframes } from "@mui/system";
import { executeFunction } from "../../utils/functionHelpers";
import { formatCurrency } from "../../utils/formatCurrency";
import { useDebouncedValue } from "../../utils/useDebouncedValue";

type Bouquet = {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  price_cents: number;
  occasion: string;
  color_story: string;
  stem_count: number;
  size: string;
  featured: boolean;
  in_stock: boolean;
  stock_quantity: number;
  image_url: string;
  accent_color: string;
  care_notes: string;
};

type CartItem = {
  bouquet: Bouquet;
  quantity: number;
  special_wrap: boolean;
};

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const heroGlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const occasions = [
  "All",
  "Birthday",
  "Anniversary",
  "Romance",
  "Thank You",
  "Celebration",
  "Housewarming",
  "Luxury",
];

const moodPill = (selected: boolean) => ({
  borderRadius: 999,
  px: 2,
  py: 1,
  border: "1px solid",
  borderColor: selected ? "transparent" : alpha("#8D6E63", 0.18),
  bgcolor: selected ? "secondary.main" : "rgba(255,255,255,0.7)",
  color: selected ? "secondary.contrastText" : "text.primary",
  boxShadow: selected ? "0 12px 30px rgba(176, 100, 83, 0.18)" : "none",
  "&:hover": {
    bgcolor: selected ? "secondary.main" : "rgba(255,255,255,0.92)",
  },
});

const selectedOccasionLabel = (occasion: string) =>
  occasion === "All" ? "" : occasion;

export const Home = () => {
  const theme = useTheme();
  const { open } = useNotification();
  const [search, setSearch] = useState("");
  const [occasion, setOccasion] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutMode, setCheckoutMode] = useState<"delivery" | "pickup">("delivery");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("Avery Rose");
  const [customerEmail, setCustomerEmail] = useState("hello@bouquetshop.com");
  const [customerPhone, setCustomerPhone] = useState("");
  const [recipientName, setRecipientName] = useState("Avery Rose");
  const [recipientMessage, setRecipientMessage] = useState("A bouquet as fresh as the moment.");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState("9:00 AM - 12:00 PM");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("New York");
  const [stateValue, setStateValue] = useState("NY");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    if (!deliveryDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeliveryDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [deliveryDate]);

  useEffect(() => {
    setRecipientName(customerName || "Avery Rose");
  }, [customerName]);

  const bouquetFilters = useMemo(() => {
    const filters: CrudFilters = [
      { field: "in_stock", operator: "eq", value: true },
    ];

    if (debouncedSearch.trim()) {
      filters.push({ field: "name", operator: "containss", value: debouncedSearch.trim() });
    }

    if (occasion !== "All") {
      filters.push({ field: "occasion", operator: "eq", value: selectedOccasionLabel(occasion) });
    }

    return filters;
  }, [debouncedSearch, occasion]);

  const bouquetsQuery = useList<Bouquet>({
    resource: "bouquets",
    pagination: { pageSize: 24 },
    sorters: [
      { field: "featured", order: "desc" },
      { field: "price_cents", order: "asc" },
    ],
    filters: bouquetFilters,
  });

  const featuredQuery = useList<Bouquet>({
    resource: "bouquets",
    pagination: { pageSize: 6 },
    sorters: [{ field: "price_cents", order: "asc" }],
    filters: [
      { field: "featured", operator: "eq", value: true },
      { field: "in_stock", operator: "eq", value: true },
    ],
  });

  const orderSummaryQuery = useList({
    resource: "orders",
    pagination: { pageSize: 1 },
    meta: { aggregate: ["count(*)", "sum(total_cents)"] },
  });

  const orderStatusQuery = useList({
    resource: "orders",
    pagination: { pageSize: 20 },
    meta: { aggregate: ["count(*)"], groupBy: ["status"] },
  });

  const catalog = (bouquetsQuery.result.data ?? []) as Bouquet[];
  const featured = (featuredQuery.result.data ?? []) as Bouquet[];
  const orderMetrics = orderSummaryQuery.result.data?.[0] as Record<string, unknown> | undefined;
  const orderStatusRows = (orderStatusQuery.result.data ?? []) as Array<Record<string, unknown>>;

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.bouquet.price_cents, 0);
  const deliveryFee = checkoutMode === "pickup" ? 0 : cartTotal > 18000 ? 0 : 1200;
  const totalCents = cartTotal + deliveryFee;

  const addToCart = (bouquet: Bouquet) => {
    setCart((current) => {
      const existing = current.find((item) => item.bouquet.id === bouquet.id);
      if (existing) {
        return current.map((item) => {
          if (item.bouquet.id !== bouquet.id) return item;
          const nextQuantity = Math.min(item.quantity + 1, bouquet.stock_quantity);
          return { ...item, quantity: nextQuantity };
        });
      }
      return [...current, { bouquet, quantity: 1, special_wrap: bouquet.featured }];
    });
    open?.({
      type: "success",
      message: `${bouquet.name} added`,
      description: "It is waiting in your cart for a graceful checkout.",
    });
  };

  const updateCartQuantity = (bouquetId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.bouquet.id !== bouquetId) return item;
          const quantity = Math.max(1, Math.min(item.quantity + delta, item.bouquet.stock_quantity));
          return { ...item, quantity };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const toggleWrap = (bouquetId: string) => {
    setCart((current) =>
      current.map((item) =>
        item.bouquet.id === bouquetId ? { ...item, special_wrap: !item.special_wrap } : item
      )
    );
  };

  const submitCheckout = async () => {
    if (cart.length === 0) {
      open?.({
        type: "error",
        message: "Your cart is empty",
        description: "Add at least one bouquet before placing an order.",
      });
      return;
    }

    if (checkoutMode === "delivery" && !deliveryAddress.trim()) {
      open?.({
        type: "error",
        message: "Delivery address required",
        description: "Enter a delivery address to continue.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await executeFunction<{
        success: boolean;
        data?: { order_number?: string };
        error?: string;
      }>("create-bouquet-order-2", {
        customer_name: customerName,
        email: customerEmail,
        phone: customerPhone,
        recipient_name: recipientName,
        recipient_message: recipientMessage,
        fulfillment_type: checkoutMode,
        delivery_date: checkoutMode === "delivery" ? deliveryDate : null,
        delivery_window: deliveryWindow,
        delivery_address: checkoutMode === "delivery" ? deliveryAddress : "",
        city,
        state: stateValue,
        postal_code: postalCode,
        notes,
        delivery_fee_cents: deliveryFee,
        items: cart.map((item) => ({
          bouquet_id: item.bouquet.id,
          quantity: item.quantity,
          special_wrap: item.special_wrap,
          unit_price_cents: item.bouquet.price_cents,
        })),
      });

      if (!response?.success) {
        throw new Error(response?.error || "Unable to place order.");
      }

      setCart([]);
      open?.({
        type: "success",
        message: "Order placed",
        description: `Your bouquet order ${response.data?.order_number || ""} has been submitted.`,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Checkout failed",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOrders = Number(orderMetrics?.count ?? 0);
  const totalRevenue = Number(orderMetrics?.sum_total_cents ?? 0);
  const readyForDispatch = orderStatusRows.reduce((sum, row) => {
    const status = String(row.status || "").toLowerCase();
    if (status === "pending" || status === "processing" || status === "shipped") {
      return sum + Number(row.count ?? 0);
    }
    return sum;
  }, 0);

  const featuredCover = featured[0] ?? catalog[0];
  const mosaic = [featured[0], featured[1], featured[2], featured[3]].filter(Boolean) as Bouquet[];

  return (
    <Container maxWidth="xl" disableGutters sx={{ position: "relative" }}>
      <Box
        sx={{
          minHeight: "calc(100vh - var(--nav-height, 60px))",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, md: 4 },
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(250,244,238,1) 0%, rgba(255,250,246,1) 38%, rgba(246,239,231,1) 100%)",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(202, 140, 120, 0.18) 0, transparent 24%), radial-gradient(circle at 80% 18%, rgba(171, 120, 92, 0.14) 0, transparent 22%), radial-gradient(circle at 50% 70%, rgba(255, 255, 255, 0.52) 0, transparent 28%)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            right: -120,
            top: -90,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.24)}, transparent 70%)`,
            filter: "blur(12px)",
            animation: `${float} 10s ease-in-out infinite`,
          }}
        />

        <Box
          sx={{
            position: "absolute",
            left: -90,
            bottom: 120,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.18)}, transparent 70%)`,
            filter: "blur(16px)",
          }}
        />

        <Stack spacing={4} sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={3} alignItems="stretch">
            <Grid size={{ xs: 12, lg: 7 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 6,
                  p: { xs: 3, md: 5 },
                  bgcolor: alpha("#FFF9F5", 0.82),
                  border: "1px solid rgba(136, 96, 74, 0.08)",
                  backdropFilter: "blur(8px)",
                  minHeight: "100%",
                  overflow: "hidden",
                  position: "relative",
                  animation: `${fadeIn} 700ms ease-out both`,
                }}
              >
                <Stack spacing={3} sx={{ maxWidth: 760 }}>
                  <Chip
                    icon={<RoseRoundedIcon />}
                    label="Maison Florale"
                    sx={{
                      alignSelf: "flex-start",
                      bgcolor: alpha(theme.palette.secondary.main, 0.12),
                      color: theme.palette.text.primary,
                      borderRadius: 999,
                    }}
                  />

                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: "0.28em",
                      color: "text.secondary",
                    }}
                  >
                    Curated bouquets · Same-day delivery · Online checkout
                  </Typography>

                  <Typography
                    variant="h1"
                    sx={{
                      fontSize: { xs: "2.9rem", sm: "4.2rem", md: "5.8rem" },
                      lineHeight: 0.92,
                      letterSpacing: "-0.05em",
                      fontWeight: 700,
                      maxWidth: 720,
                    }}
                  >
                    Bouquets that arrive like a love letter.
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      maxWidth: 720,
                      color: "text.secondary",
                      fontWeight: 400,
                      lineHeight: 1.7,
                    }}
                  >
                    Hand-tied compositions for birthdays, anniversaries, apologies, and the
                    kind of spontaneous moments that deserve a beautiful delivery.
                  </Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<StorefrontRoundedIcon />}
                      href="#shop"
                      sx={{
                        borderRadius: 999,
                        px: 3,
                        py: 1.6,
                        bgcolor: "secondary.main",
                        color: "secondary.contrastText",
                        "&:hover": { bgcolor: "secondary.dark" },
                      }}
                    >
                      Shop today&apos;s stems
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<LocalShippingRoundedIcon />}
                      href="#checkout"
                      sx={{
                        borderRadius: 999,
                        px: 3,
                        py: 1.6,
                        borderColor: alpha(theme.palette.text.primary, 0.14),
                        color: "text.primary",
                      }}
                    >
                      Place an order online
                    </Button>
                  </Stack>
                </Stack>

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    mt: 4,
                    flexWrap: "wrap",
                    rowGap: 2,
                  }}
                >
                  {[
                    { label: "Bouquets ready", value: catalog.length.toString() },
                    { label: "Orders served", value: totalOrders.toString() },
                    { label: "Revenue", value: formatCurrency(totalRevenue) },
                    { label: "Ready to dispatch", value: readyForDispatch.toString() },
                  ].map((stat) => (
                    <Box
                      key={stat.label}
                      sx={{
                        minWidth: 150,
                        px: 2.25,
                        py: 1.75,
                        borderRadius: 4,
                        bgcolor: "rgba(255,255,255,0.72)",
                        border: "1px solid rgba(130, 91, 72, 0.08)",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 6,
                  overflow: "hidden",
                  minHeight: "100%",
                  border: "1px solid rgba(136, 96, 74, 0.08)",
                  bgcolor: alpha("#FFF8F4", 0.9),
                  animation: `${fadeIn} 900ms ease-out both`,
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: "1.2fr 0.8fr",
                    minHeight: 340,
                  }}
                >
                  <Box
                    sx={{
                      borderRadius: 5,
                      overflow: "hidden",
                      minHeight: 340,
                      backgroundImage: `linear-gradient(180deg, transparent 0%, rgba(66, 46, 36, 0.06) 100%), url(${featuredCover?.image_url || ""})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        background:
                          "linear-gradient(180deg, rgba(22,14,10,0.08) 0%, rgba(22,14,10,0.34) 100%)",
                        color: "#fff8f2",
                      }}
                    >
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          icon={<WorkspacePremiumRoundedIcon sx={{ color: "#fff8f2 !important" }} />}
                          label="Editor's pick"
                          sx={{
                            bgcolor: "rgba(255,255,255,0.18)",
                            color: "#fff8f2",
                            border: "1px solid rgba(255,255,255,0.14)",
                          }}
                        />
                        <Chip
                          icon={<FavoriteRoundedIcon sx={{ color: "#fff8f2 !important" }} />}
                          label={featuredCover?.occasion || "Curated"}
                          sx={{
                            bgcolor: "rgba(255,255,255,0.18)",
                            color: "#fff8f2",
                            border: "1px solid rgba(255,255,255,0.14)",
                          }}
                        />
                      </Stack>
                      <Box>
                        <Typography variant="overline" sx={{ letterSpacing: "0.25em" }}>
                          Signature bouquet
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.05 }}>
                          {featuredCover?.name || "Rose Serenade"}
                        </Typography>
                        <Typography variant="body1" sx={{ maxWidth: 320, mt: 1.2, opacity: 0.9 }}>
                          {featuredCover?.subtitle || "A layered bouquet with a sculpted finish."}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Stack spacing={1.25}>
                    {mosaic.map((bouquet, index) => (
                      <Box
                        key={bouquet.id}
                        sx={{
                          flex: 1,
                          minHeight: 98,
                          borderRadius: 4,
                          overflow: "hidden",
                          position: "relative",
                          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(15,10,6,0.1)), url(${bouquet.image_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          boxShadow: "0 14px 40px rgba(112, 73, 55, 0.12)",
                          animation: `${float} ${7 + index}s ease-in-out infinite`,
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            inset: 0,
                            p: 1.5,
                            display: "flex",
                            alignItems: "end",
                            color: "#fff7f1",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(27,15,10,0.42) 100%)",
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {bouquet.name}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>
                              {formatCurrency(bouquet.price_cents)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Divider />
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                    {orderStatusRows.map((row) => (
                      <Chip
                        key={String(row.status)}
                        label={`${String(row.status)} · ${String(row.count ?? 0)}`}
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          borderRadius: 999,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box id="shop" />
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "end" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: "0.28em" }}>
                  The collection
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: "-0.04em" }}>
                  Shop by mood, color, and occasion.
                </Typography>
              </Box>
              <TextField
                label="Search bouquets"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ width: { xs: "100%", md: 360 }, bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
              />
            </Stack>

            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
              {occasions.map((entry) => (
                <Button
                  key={entry}
                  onClick={() => setOccasion(entry)}
                  sx={moodPill(occasion === entry)}
                  disableElevation
                >
                  {entry}
                </Button>
              ))}
            </Stack>
          </Stack>

          <Grid container spacing={3} alignItems="flex-start">
            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container spacing={2}>
                {bouquetsQuery.query.isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <Grid key={index} size={{ xs: 12, sm: 6 }}>
                        <Skeleton variant="rounded" height={340} sx={{ borderRadius: 4 }} />
                      </Grid>
                    ))
                  : catalog.map((bouquet) => {
                      const inCart = cart.find((item) => item.bouquet.id === bouquet.id);
                      return (
                        <Grid key={bouquet.id} size={{ xs: 12, sm: 6 }}>
                          <Card
                            elevation={0}
                            sx={{
                              height: "100%",
                              borderRadius: 5,
                              overflow: "hidden",
                              border: "1px solid rgba(138, 101, 83, 0.08)",
                              bgcolor: "rgba(255,255,255,0.78)",
                              backdropFilter: "blur(6px)",
                            }}
                          >
                            <CardActionArea
                              sx={{ height: "100%", alignItems: "stretch" }}
                              onClick={() => addToCart(bouquet)}
                            >
                              <Box
                                sx={{
                                  height: 220,
                                  backgroundImage: `linear-gradient(180deg, transparent 0%, rgba(31, 19, 14, 0.16) 100%), url(${bouquet.image_url})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              />
                              <CardContent sx={{ p: 2.5 }}>
                                <Stack spacing={1.5}>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Chip label={bouquet.occasion} size="small" sx={{ borderRadius: 999 }} />
                                    <Chip
                                      label={bouquet.size}
                                      size="small"
                                      sx={{
                                        borderRadius: 999,
                                        bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                      }}
                                    />
                                    <Chip
                                      label={`${bouquet.stem_count} stems`}
                                      size="small"
                                      sx={{
                                        borderRadius: 999,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      }}
                                    />
                                  </Stack>

                                  <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                      {bouquet.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                      {bouquet.subtitle}
                                    </Typography>
                                  </Box>

                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      minHeight: 56,
                                      lineHeight: 1.65,
                                    }}
                                  >
                                    {bouquet.description}
                                  </Typography>

                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                      <Typography variant="overline" sx={{ letterSpacing: "0.2em" }}>
                                        Price
                                      </Typography>
                                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                        {formatCurrency(bouquet.price_cents)}
                                      </Typography>
                                    </Box>
                                    <Button
                                      variant={inCart ? "outlined" : "contained"}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        addToCart(bouquet);
                                      }}
                                      sx={{ borderRadius: 999, px: 2.5 }}
                                    >
                                      {inCart ? "Add another" : "Add to cart"}
                                    </Button>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        </Grid>
                      );
                    })}
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Paper
                id="checkout"
                elevation={0}
                sx={{
                  position: { lg: "sticky" },
                  top: { lg: 24 },
                  borderRadius: 5,
                  p: 2.5,
                  border: "1px solid rgba(138, 101, 83, 0.08)",
                  bgcolor: "rgba(255,255,255,0.84)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
                      Checkout
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Place your bouquet order online.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      Orders are written into Taruvi the moment you submit the form.
                    </Typography>
                  </Box>

                  <Stack spacing={1.5}>
                    <TextField label="Your name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                    <TextField label="Email address" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
                    <TextField label="Phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
                    <TextField label="Recipient name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
                    <TextField
                      label="Recipient message"
                      multiline
                      minRows={3}
                      value={recipientMessage}
                      onChange={(event) => setRecipientMessage(event.target.value)}
                    />

                    <FormControl fullWidth>
                      <InputLabel>Fulfillment</InputLabel>
                      <Select
                        label="Fulfillment"
                        value={checkoutMode}
                        onChange={(event) => setCheckoutMode(event.target.value as "delivery" | "pickup")}
                      >
                        <MenuItem value="delivery">Delivery</MenuItem>
                        <MenuItem value="pickup">Pickup</MenuItem>
                      </Select>
                    </FormControl>

                    {checkoutMode === "delivery" && (
                      <>
                        <TextField
                          type="date"
                          label="Delivery date"
                          InputLabelProps={{ shrink: true }}
                          value={deliveryDate}
                          onChange={(event) => setDeliveryDate(event.target.value)}
                        />
                        <TextField
                          label="Delivery window"
                          value={deliveryWindow}
                          onChange={(event) => setDeliveryWindow(event.target.value)}
                        />
                        <TextField
                          label="Delivery address"
                          value={deliveryAddress}
                          onChange={(event) => setDeliveryAddress(event.target.value)}
                        />
                        <Stack direction="row" spacing={1.5}>
                          <TextField label="City" value={city} onChange={(event) => setCity(event.target.value)} fullWidth />
                          <TextField label="State" value={stateValue} onChange={(event) => setStateValue(event.target.value)} fullWidth />
                        </Stack>
                        <TextField
                          label="Postal code"
                          value={postalCode}
                          onChange={(event) => setPostalCode(event.target.value)}
                        />
                      </>
                    )}

                    <TextField label="Notes" multiline minRows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
                  </Stack>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Your cart
                    </Typography>
                    {cart.length === 0 ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderStyle: "dashed",
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Add bouquets from the collection to start a checkout.
                        </Typography>
                      </Paper>
                    ) : (
                      <Stack spacing={1.5}>
                        {cart.map((item) => (
                          <Paper
                            key={item.bouquet.id}
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.92)" }}
                          >
                            <Stack spacing={1}>
                              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <Box
                                  sx={{
                                    width: 62,
                                    height: 62,
                                    borderRadius: 2.5,
                                    backgroundImage: `url(${item.bouquet.image_url})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    flexShrink: 0,
                                  }}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {item.bouquet.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {formatCurrency(item.bouquet.price_cents)} each
                                  </Typography>
                                </Box>
                                <IconButton size="small" onClick={() => updateCartQuantity(item.bouquet.id, -1)}>
                                  <RemoveRoundedIcon fontSize="small" />
                                </IconButton>
                                <Typography sx={{ minWidth: 22, textAlign: "center", pt: 0.6 }}>
                                  {item.quantity}
                                </Typography>
                                <IconButton size="small" onClick={() => updateCartQuantity(item.bouquet.id, 1)}>
                                  <AddRoundedIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  size="small"
                                  label={item.special_wrap ? "Gift wrap on" : "Gift wrap off"}
                                  onClick={() => toggleWrap(item.bouquet.id)}
                                  sx={{ borderRadius: 999 }}
                                />
                                <Chip
                                  size="small"
                                  label={`${formatCurrency(item.quantity * item.bouquet.price_cents)} line total`}
                                  sx={{ borderRadius: 999, bgcolor: alpha(theme.palette.primary.main, 0.08) }}
                                />
                              </Stack>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.secondary.main, 0.06),
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">Bouquet subtotal</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{formatCurrency(cartTotal)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">Delivery fee</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{formatCurrency(deliveryFee)}</Typography>
                      </Stack>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 700 }}>Total</Typography>
                        <Typography sx={{ fontWeight: 800 }}>{formatCurrency(totalCents)}</Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={submitCheckout}
                    disabled={cart.length === 0 || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress color="inherit" size={18} /> : <CelebrationRoundedIcon />}
                    sx={{
                      borderRadius: 999,
                      py: 1.5,
                      bgcolor: "secondary.main",
                      color: "secondary.contrastText",
                      "&:hover": { bgcolor: "secondary.dark" },
                    }}
                  >
                    {isSubmitting ? "Placing order..." : "Place order"}
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 5,
              p: { xs: 2.5, md: 4 },
              bgcolor: alpha("#FFF8F3", 0.84),
              border: "1px solid rgba(136, 96, 74, 0.08)",
            }}
          >
            <Grid container spacing={3}>
              {[
                {
                  title: "Editorial curation",
                  text: "Each bouquet is styled like a page from a luxury magazine.",
                },
                {
                  title: "Fast online checkout",
                  text: "Orders are created in Taruvi with customer, order, and line-item records.",
                },
                {
                  title: "Beautiful delivery moments",
                  text: "Same-day delivery options keep the service practical without losing the romance.",
                },
              ].map((item) => (
                <Grid key={item.title} size={{ xs: 12, md: 4 }}>
                  <Box sx={{ pr: { md: 2 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      {item.text}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
};
