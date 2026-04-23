import { useForm } from "@refinedev/react-hook-form";
import type { HttpError } from "@refinedev/core";
import { Create } from "@refinedev/mui";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { BouquetFormFields, type BouquetFormValues } from "./BouquetFormFields";

const defaultValues: BouquetFormValues = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  price_cents: 0,
  occasion: "Birthday",
  color_story: "",
  stem_count: 12,
  size: "Signature",
  featured: false,
  in_stock: true,
  stock_quantity: 1,
  image_url: "",
  accent_color: "#B87A6A",
  care_notes: "",
};

export const BouquetCreate = () => {
  const {
    saveButtonProps,
    register,
    control,
    formState: { errors },
  } = useForm<BouquetFormValues, HttpError, BouquetFormValues>({
    refineCoreProps: {
      resource: "bouquets",
      action: "create",
    },
    defaultValues,
  });

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Create saveButtonProps={saveButtonProps}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: "rgba(255,255,255,0.86)",
              border: "1px solid rgba(138, 101, 83, 0.08)",
            }}
          >
            <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
              Bouquet editor
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              Create a new bouquet
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Add a fresh stem recipe to the live bouquet catalog.
            </Typography>
          </Paper>
          <BouquetFormFields control={control} errors={errors} register={register} />
        </Stack>
      </Create>
    </Box>
  );
};
