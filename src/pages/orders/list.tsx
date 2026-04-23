import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Box, Button, Chip, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { CrudFilters, CrudSort } from "@refinedev/core";
import { useDataGrid } from "@refinedev/mui";
import { useDebouncedValue } from "../../utils/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";

const statuses = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

export const OrderList = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search, 350);

  const filters = useMemo(() => {
    const next: CrudFilters = [];
    if (debouncedSearch.trim()) {
      next.push({ field: "order_number", operator: "containss", value: debouncedSearch.trim() });
    }
    if (status !== "all") {
      next.push({ field: "status", operator: "eq", value: status });
    }
    return next;
  }, [debouncedSearch, status]);

  const sorters: CrudSort[] = [{ field: "created_at", order: "desc" }];

  const { dataGridProps, tableQuery } = useDataGrid({
    resource: "orders",
    pagination: { pageSize },
    sorters: { initial: sorters, mode: "server" },
    filters: { initial: filters, mode: "server" },
    meta: { populate: ["customer_id"] },
  });

  const columns: GridColDef[] = [
    { field: "order_number", headerName: "Order", minWidth: 160, flex: 1 },
    {
      field: "customer_id",
      headerName: "Customer",
      minWidth: 180,
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{params.row.customer_id?.full_name || params.row.recipient_name || "Guest"}</Typography>
          <Typography variant="body2" color="text.secondary">
            {params.row.customer_id?.email || params.row.contact_phone || "No email"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => <Chip label={params.value} size="small" color={params.value === "delivered" ? "success" : "default"} sx={{ borderRadius: 999 }} />,
    },
    { field: "fulfillment_type", headerName: "Fulfillment", width: 130 },
    {
      field: "total_cents",
      headerName: "Total",
      width: 140,
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 180,
      valueFormatter: (value) => new Date(String(value)).toLocaleString(),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      width: 210,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button component={Link} to={`/orders/show/${params.row.id}`} size="small" startIcon={<VisibilityRoundedIcon />} variant="outlined">
            View
          </Button>
          <Button component={Link} to={`/orders/edit/${params.row.id}`} size="small" startIcon={<EditRoundedIcon />} variant="contained">
            Edit
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "rgba(255,255,255,0.85)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
          <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
            Fulfillment
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Orders
          </Typography>
          <Typography color="text.secondary">Track live orders, fulfillment, and customer delivery details.</Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: "rgba(255,255,255,0.8)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth label="Search order number" value={search} onChange={(event) => setSearch(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 3.5 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {statuses.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Rows</InputLabel>
                <Select label="Rows" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {[10, 20, 50, 100].map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <Button component={Link} to="/bouquets" variant="outlined" sx={{ height: "100%", width: "100%", borderRadius: 2 }}>
                Shop
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 4, overflow: "hidden", bgcolor: "rgba(255,255,255,0.88)", border: "1px solid rgba(138, 101, 83, 0.08)" }}>
          <DataGrid
            {...dataGridProps}
            columns={columns}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50, 100]}
            loading={tableQuery.isLoading}
            sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: "rgba(250, 243, 238, 0.9)" } }}
          />
        </Paper>
      </Stack>
    </Box>
  );
};
