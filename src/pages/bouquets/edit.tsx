import { useForm } from "@refinedev/react-hook-form";
import type { HttpError } from "@refinedev/core";
import { Edit } from "@refinedev/mui";
import { useShow } from "@refinedev/core";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { BouquetFormFields, type BouquetFormValues } from "./BouquetFormFields";
import { useParams } from "react-router";

export const BouquetEdit = () => {
  const params = useParams();
  const id = params.id ?? "";

  const {
    saveButtonProps,
    register,
    control,
    formState: { errors },
  } = useForm<BouquetFormValues, HttpError, BouquetFormValues>({
    refineCoreProps: {
      resource: "bouquets",
      action: "edit",
      id,
    },
  });

  const { result } = useShow<BouquetFormValues>({
    resource: "bouquets",
    id,
  });

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Edit saveButtonProps={saveButtonProps}>
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
              Edit bouquet
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {result?.name ? `Updating ${result.name}.` : "Update the bouquet details and stock."}
            </Typography>
          </Paper>
          <BouquetFormFields control={control} errors={errors} register={register} />
        </Stack>
      </Edit>
    </Box>
  );
};
