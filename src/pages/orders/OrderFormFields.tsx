import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { FormControl, FormHelperText, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";

export type OrderFormValues = {
  status: string;
  fulfillment_type: string;
  delivery_window: string;
  delivery_date: string;
  recipient_name: string;
  recipient_message: string;
  delivery_address: string;
  city: string;
  state: string;
  postal_code: string;
  contact_phone: string;
  notes: string;
};

type Props = {
  control: Control<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  register: UseFormRegister<OrderFormValues>;
};

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const fulfillmentTypes = ["delivery", "pickup"];

export const OrderFormFields = ({ control, errors, register }: Props) => {
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
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Update order details
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth error={!!errors.status}>
              <InputLabel>Status</InputLabel>
              <Controller
                control={control}
                name="status"
                rules={{ required: "Status is required" }}
                render={({ field }) => (
                  <Select {...field} label="Status">
                    {statuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.status?.message}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth error={!!errors.fulfillment_type}>
              <InputLabel>Fulfillment</InputLabel>
              <Controller
                control={control}
                name="fulfillment_type"
                rules={{ required: "Fulfillment type is required" }}
                render={({ field }) => (
                  <Select {...field} label="Fulfillment">
                    {fulfillmentTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              <FormHelperText>{errors.fulfillment_type?.message}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("delivery_window")} label="Delivery window" fullWidth error={!!errors.delivery_window} helperText={errors.delivery_window?.message} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("delivery_date")} label="Delivery date" type="date" fullWidth InputLabelProps={{ shrink: true }} error={!!errors.delivery_date} helperText={errors.delivery_date?.message} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("recipient_name", { required: "Recipient name is required" })} label="Recipient name" fullWidth error={!!errors.recipient_name} helperText={errors.recipient_name?.message} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("contact_phone")} label="Contact phone" fullWidth error={!!errors.contact_phone} helperText={errors.contact_phone?.message} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField {...register("recipient_message")} label="Recipient message" fullWidth multiline minRows={3} error={!!errors.recipient_message} helperText={errors.recipient_message?.message} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField {...register("delivery_address")} label="Delivery address" fullWidth error={!!errors.delivery_address} helperText={errors.delivery_address?.message} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("city")} label="City" fullWidth error={!!errors.city} helperText={errors.city?.message} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("state")} label="State" fullWidth error={!!errors.state} helperText={errors.state?.message} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField {...register("postal_code")} label="Postal code" fullWidth error={!!errors.postal_code} helperText={errors.postal_code?.message} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField {...register("notes")} label="Internal notes" fullWidth multiline minRows={2} error={!!errors.notes} helperText={errors.notes?.message} />
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );
};
