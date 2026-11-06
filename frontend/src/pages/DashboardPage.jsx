import { useCallback } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { getOrders, getProducts, getUsers } from "../api";
import { formatDate, formatMoney } from "../format";
import { useResource } from "../hooks/useResource";

function loadOverview() {
  return Promise.all([getProducts(), getUsers(), getOrders()]).then(
    ([products, users, orders]) => [{ products, users, orders }]
  );
}

function MetricCard({ label, value, detail, to }) {
  return (
    <Paper sx={{ p: 2.5, flex: "1 1 200px", borderTop: "4px solid", borderColor: "primary.main" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ my: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {detail}
      </Typography>
      <Button component={RouterLink} to={to} size="small">
        Open
      </Button>
    </Paper>
  );
}

export default function DashboardPage() {
  const loadRows = useCallback(() => loadOverview(), []);
  const { rows, loading, loadError, reload } = useResource(loadRows);
  const overview = rows[0] ?? { products: [], users: [], orders: [] };
  const lowStock = overview.products.filter((product) => product.qty <= 5);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress aria-label="Loading overview" />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reload}>
            Retry
          </Button>
        }
      >
        {loadError}
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Catalog at a glance</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Orders always point at an existing user and an existing product.
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
        <MetricCard
          label="Products"
          value={overview.products.length}
          detail={`${lowStock.length} at or below 5 in stock`}
          to="/products"
        />
        <MetricCard
          label="Users"
          value={overview.users.length}
          detail="Accounts stored with hashed passwords"
          to="/users"
        />
        <MetricCard
          label="Orders"
          value={overview.orders.length}
          detail="Linked to both a user and a product"
          to="/orders"
        />
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Paper sx={{ p: 2.5, flex: 1.4 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Recent orders
          </Typography>
          {overview.orders.length === 0 ? (
            <Typography color="text.secondary">No orders yet.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {overview.orders.slice(0, 5).map((order) => (
                <Box
                  key={order.oid}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography fontWeight={600}>
                      {order.uname} · {order.pname}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(order.order_date)}
                    </Typography>
                  </Box>
                  <Typography fontWeight={600}>{formatMoney(order.price)}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2.5, flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Low stock
          </Typography>
          {lowStock.length === 0 ? (
            <Typography color="text.secondary">Every product has more than 5 on hand.</Typography>
          ) : (
            <Stack spacing={1}>
              {lowStock.map((product) => (
                <Box key={product.pid} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Typography>{product.pname}</Typography>
                  <Chip
                    size="small"
                    label={`${product.qty} left`}
                    color={product.qty === 0 ? "error" : "warning"}
                    variant="outlined"
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Stack>
  );
}
