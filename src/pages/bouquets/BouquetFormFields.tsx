import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Box, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";

export type BouquetFormValues = {
  slug: string;
  name: string;
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

type Props = {
  control: Control<BouquetFormValues>;
  errors: FieldErrors<BouquetFormValues>;
  register: UseFormRegister<BouquetFormValues>;
};

const occasions = [
  "Birthday",
  "Anniversary",
  "Romance",
  "Thank You",
  "Celebration",
  "Housewarming",
  "Luxury",
  "Sympathy",
  "Milestone",
  "New Baby",
  "Apology",
];

const sizes = ["Petite", "Signature", "Classic", "Deluxe", "Statement"];

export const BouquetFormFields = ({ control, errors, register }: Props) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 4,
        bgcolor: "rgba(255,255,255,0.86)",
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
            Bouquet details
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Compose the product story.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              {...register("name", { required: "Name is required" })}
              label="Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              {...register("slug", { required: "Slug is required" })}
              label="Slug"
              fullWidth
              error={!!errors.slug}
              helperText={errors.slug?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              {...register("subtitle", { required: "Subtitle is required" })}
              label="Subtitle"
              fullWidth
              error={!!errors.subtitle}
              helperText={errors.subtitle?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              {...register("description", { required: "Description is required" })}
              label="Description"
              fullWidth
              multiline
              minRows={4}
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              {...register("price_cents", {
                required: "Price is required",
                valueAsNumber: true,
                min: { value: 1, message: "Price must be greater than zero" },
              })}
              label="Price (cents)"
              type="number"
              fullWidth
              error={!!errors.price_cents}
              helperText={errors.price_cents?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              {...register("stem_count", {
                required: "Stem count is required",
                valueAsNumber: true,
                min: { value: 1, message: "Stem count must be greater than zero" },
              })}
              label="Stem count"
              type="number"
              fullWidth
              error={!!errors.stem_count}
              helperText={errors.stem_count?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth error={!!errors.occasion}>
              <InputLabel>Occasion</InputLabel>
              <Controller
                control={control}
                name="occasion"
                rules={{ required: "Occasion is required" }}
                render={({ field }) => (
                  <Select {...field} label="Occasion">
                    {occasions.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.occasion?.message}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth error={!!errors.size}>
              <InputLabel>Size</InputLabel>
              <Controller
                control={control}
                name="size"
                rules={{ required: "Size is required" }}
                render={({ field }) => (
                  <Select {...field} label="Size">
                    {sizes.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.size?.message}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              {...register("color_story", { required: "Color story is required" })}
              label="Color story"
              fullWidth
              error={!!errors.color_story}
              helperText={errors.color_story?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              {...register("accent_color", { required: "Accent color is required" })}
              label="Accent color"
              fullWidth
              helperText={errors.accent_color?.message || "Hex or named color."}
              error={!!errors.accent_color}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              {...register("stock_quantity", {
                required: "Stock quantity is required",
                valueAsNumber: true,
                min: { value: 0, message: "Stock cannot be negative" },
              })}
              label="Stock quantity"
              type="number"
              fullWidth
              error={!!errors.stock_quantity}
              helperText={errors.stock_quantity?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              {...register("image_url", { required: "Image URL is required" })}
              label="Image URL"
              fullWidth
              error={!!errors.image_url}
              helperText={errors.image_url?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              {...register("care_notes", { required: "Care notes are required" })}
              label="Care notes"
              fullWidth
              multiline
              minRows={3}
              error={!!errors.care_notes}
              helperText={errors.care_notes?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Featured</InputLabel>
                  <Select {...field} value={field.value ? "true" : "false"} label="Featured" onChange={(event) => field.onChange(event.target.value === "true")}>
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              control={control}
              name="in_stock"
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>In stock</InputLabel>
                  <Select {...field} value={field.value ? "true" : "false"} label="In stock" onChange={(event) => field.onChange(event.target.value === "true")}>
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );
};
