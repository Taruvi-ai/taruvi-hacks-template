import { useForm } from "@refinedev/react-hook-form";
import type { HttpError } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { useParams } from "react-router";
import { OrderFormFields, type OrderFormValues } from "./OrderFormFields";

const defaultValues: OrderFormValues = {
  status: "pending",
  fulfillment_type: "delivery",
  delivery_window: "",
  delivery_date: "",
  recipient_name: "",
  recipient_message: "",
  delivery_address: "",
  city: "",
  state: "",
  postal_code: "",
  contact_phone: "",
  notes: "",
};

export const OrderEdit = () => {
  const params = useParams();
  const id = params.id ?? "";
  const {
    saveButtonProps,
    register,
    control,
    formState: { errors },
  } = useForm<OrderFormValues, HttpError, OrderFormValues>({
    refineCoreProps: {
      resource: "orders",
      action: "edit",
      id,
    },
    defaultValues,
  });

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Edit saveButtonProps={saveButtonProps}>
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.86)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
            <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
              Order editor
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              Edit order
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Update fulfillment details and internal notes.
            </Typography>
          </Paper>
          <OrderFormFields control={control} errors={errors} register={register} />
        </Stack>
      </Edit>
    </Box>
  );
};
