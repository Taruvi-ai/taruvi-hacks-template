import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Box, Button, Chip, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { CrudFilters, CrudSort } from "@refinedev/core";
import { useDataGrid } from "@refinedev/mui";
import { useDebouncedValue } from "../../utils/useDebouncedValue";
import { formatCurrency } from "../../utils/formatCurrency";

const occasions = ["All", "Birthday", "Anniversary", "Romance", "Thank You", "Celebration", "Housewarming", "Luxury", "Sympathy", "Milestone", "New Baby", "Apology"];

export const BouquetList = () => {
  const [search, setSearch] = useState("");
  const [occasion, setOccasion] = useState("All");
  const [stockFilter, setStockFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const debouncedSearch = useDebouncedValue(search, 350);

  const filters = useMemo(() => {
    const next: CrudFilters = [];
    if (debouncedSearch.trim()) {
      next.push({ field: "name", operator: "containss", value: debouncedSearch.trim() });
    }
    if (occasion !== "All") {
      next.push({ field: "occasion", operator: "eq", value: occasion });
    }
    if (stockFilter !== "all") {
      next.push({ field: "in_stock", operator: "eq", value: stockFilter === "stocked" });
    }
    return next;
  }, [debouncedSearch, occasion, stockFilter]);

  const sorters: CrudSort[] = [
    { field: "featured", order: "desc" },
    { field: "created_at", order: "desc" },
  ];

  const { dataGridProps, tableQuery } = useDataGrid({
    resource: "bouquets",
    pagination: { pageSize },
    sorters: { initial: sorters, mode: "server" },
    filters: { initial: filters, mode: "server" },
  });

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Bouquet",
      flex: 1.3,
      minWidth: 220,
      renderCell: (params) => (
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{params.row.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {params.row.subtitle}
          </Typography>
        </Box>
      ),
    },
    {
      field: "occasion",
      headerName: "Occasion",
      width: 140,
      renderCell: (params) => <Chip label={params.value} size="small" sx={{ borderRadius: 999 }} />,
    },
    {
      field: "price_cents",
      headerName: "Price",
      width: 130,
      valueFormatter: (value) => formatCurrency(Number(value)),
    },
    {
      field: "stock_quantity",
      headerName: "Stock",
      width: 110,
    },
    {
      field: "featured",
      headerName: "Featured",
      width: 110,
      renderCell: (params) => <Chip label={params.value ? "Yes" : "No"} size="small" color={params.value ? "secondary" : "default"} sx={{ borderRadius: 999 }} />,
    },
    {
      field: "in_stock",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value ? "Available" : "Sold out"} size="small" color={params.value ? "success" : "default"} sx={{ borderRadius: 999 }} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      width: 210,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button component={Link} to={`/bouquets/show/${params.row.id}`} size="small" startIcon={<VisibilityRoundedIcon />} variant="outlined">
            View
          </Button>
          <Button component={Link} to={`/bouquets/edit/${params.row.id}`} size="small" startIcon={<EditRoundedIcon />} variant="contained">
            Edit
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            bgcolor: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(138, 101, 83, 0.08)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: "0.22em" }}>
                Catalog management
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                Bouquets
              </Typography>
              <Typography color="text.secondary">Live catalog management for the florist shop.</Typography>
            </Box>
            <Button component={Link} to="/bouquets/create" variant="contained" startIcon={<AddRoundedIcon />} sx={{ borderRadius: 999, px: 2.5 }}>
              New bouquet
            </Button>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 4,
            bgcolor: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(138, 101, 83, 0.08)",
          }}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField fullWidth label="Search bouquets" value={search} onChange={(event) => setSearch(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Occasion</InputLabel>
                <Select label="Occasion" value={occasion} onChange={(event) => setOccasion(event.target.value)}>
                  {occasions.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Stock</InputLabel>
                <Select label="Stock" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="stocked">In stock</MenuItem>
                  <MenuItem value="empty">Sold out</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 1.5 }}>
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
          </Grid>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(138, 101, 83, 0.08)",
          }}
        >
          <DataGrid
            {...dataGridProps}
            columns={columns}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50, 100]}
            loading={tableQuery.isLoading}
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "rgba(250, 243, 238, 0.9)",
              },
            }}
          />
        </Paper>
      </Stack>
    </Box>
  );
};
