import { useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  addOrder,
  deleteOrder,
  getOrders,
  getOrdersByProduct,
  getOrdersByUser,
  getProducts,
  getUsers,
  updateOrder,
} from "../api";
import ConfirmDialog from "../components/ConfirmDialog";
import FormDialog from "../components/FormDialog";
import NoticeSnackbar from "../components/NoticeSnackbar";
import { formatDate, formatMoney, todayInputValue } from "../format";
import { useResource } from "../hooks/useResource";

const rowsPerPage = 8;

function emptyForm() {
  return { uid: "", pid: "", orderDate: todayInputValue() };
}

function validateOrder(form) {
  if (!form.uid) {
    return "Choose a user";
  }
  if (!form.pid) {
    return "Choose a product";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.orderDate)) {
    return "Choose a valid order date";
  }
  return "";
}

export default function OrdersPage() {
  const [scope, setScope] = useState("all");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [lookupError, setLookupError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadRows = useCallback(() => {
    if (scope === "user") {
      return filterUserId ? getOrdersByUser(filterUserId) : Promise.resolve([]);
    }
    if (scope === "product") {
      return filterProductId ? getOrdersByProduct(filterProductId) : Promise.resolve([]);
    }
    return getOrders();
  }, [scope, filterUserId, filterProductId]);

  const { rows, loading, loadError, reload } = useResource(loadRows);

  useEffect(() => {
    let active = true;
    Promise.all([getUsers(), getProducts()])
      .then(([nextUsers, nextProducts]) => {
        if (!active) {
          return;
        }
        setUsers(Array.isArray(nextUsers) ? nextUsers : []);
        setProducts(Array.isArray(nextProducts) ? nextProducts : []);
        setLookupError("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setLookupError(error instanceof Error ? error.message : "Could not load users and products");
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((order) =>
      `${order.oid} ${order.uname} ${order.email} ${order.pname} ${order.order_date}`
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, query]);

  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const waitingForFilter =
    (scope === "user" && !filterUserId) || (scope === "product" && !filterProductId);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm(),
      uid: filterUserId || (users[0] ? String(users[0].uid) : ""),
      pid: filterProductId || (products[0] ? String(products[0].pid) : ""),
    });
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(order) {
    setEditing(order);
    setForm({
      uid: String(order.uid),
      pid: String(order.pid),
      orderDate: order.order_date,
    });
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateOrder(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      uid: Number(form.uid),
      pid: Number(form.pid),
      order_date: form.orderDate,
    };

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateOrder(editing.oid, payload);
        setNotice({ severity: "success", message: "Order updated" });
      } else {
        await addOrder(payload);
        setNotice({ severity: "success", message: "Order added" });
      }
      setDialogOpen(false);
      await reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the order");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      await deleteOrder(pendingDelete.oid);
      setNotice({ severity: "success", message: "Order deleted" });
      setPendingDelete(null);
      await reload();
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete the order",
      });
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h4">Orders</Typography>
          <Typography color="text.secondary">
            Each order stores a user, a product, and the order date.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={users.length === 0 || products.length === 0}
        >
          Add order
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            select
            label="Show"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All orders</MenuItem>
            <MenuItem value="user">Orders for a user</MenuItem>
            <MenuItem value="product">Orders for a product</MenuItem>
          </TextField>
          {scope === "user" ? (
            <TextField
              select
              label="User"
              value={filterUserId}
              onChange={(event) => {
                setFilterUserId(event.target.value);
                setPage(0);
              }}
              size="small"
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Select a user</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.uid} value={String(user.uid)}>
                  {user.uname}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          {scope === "product" ? (
            <TextField
              select
              label="Product"
              value={filterProductId}
              onChange={(event) => {
                setFilterProductId(event.target.value);
                setPage(0);
              }}
              size="small"
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Select a product</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.pid} value={String(product.pid)}>
                  {product.pname}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Search orders"
            size="small"
            fullWidth
            slotProps={{ htmlInput: { "aria-label": "Search orders" } }}
          />
        </Stack>
      </Paper>

      {lookupError ? <Alert severity="warning">{lookupError}</Alert> : null}
      {loadError ? (
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
      ) : null}

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress aria-label="Loading orders" />
          </Box>
        ) : (
          <>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Unit price</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        {waitingForFilter
                          ? scope === "user"
                            ? "Select a user to see their orders."
                            : "Select a product to see its orders."
                          : rows.length === 0
                            ? "No orders yet."
                            : "No orders match your search."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((order) => (
                    <TableRow key={order.oid} hover>
                      <TableCell>
                        <Typography fontWeight={600}>#{order.oid}</Typography>
                      </TableCell>
                      <TableCell>{formatDate(order.order_date)}</TableCell>
                      <TableCell>
                        <Typography>{order.uname}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.pname}</TableCell>
                      <TableCell align="right">{formatMoney(order.price)}</TableCell>
                      <TableCell align="right">
                        <IconButton aria-label={`Edit order ${order.oid}`} onClick={() => openEdit(order)}>
                          <EditOutlinedIcon />
                        </IconButton>
                        <IconButton
                          aria-label={`Delete order ${order.oid}`}
                          color="error"
                          onClick={() => setPendingDelete(order)}
                        >
                          <DeleteOutlinedIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filtered.length}
              page={filtered.length === 0 ? 0 : page}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
            />
          </>
        )}
      </TableContainer>

      <FormDialog
        open={dialogOpen}
        title={editing ? "Edit order" : "Add order"}
        error={formError}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          select
          label="User"
          value={form.uid}
          onChange={(event) => setForm((current) => ({ ...current, uid: event.target.value }))}
          required
          fullWidth
        >
          {users.map((user) => (
            <MenuItem key={user.uid} value={String(user.uid)}>
              {user.uname} · {user.email}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Product"
          value={form.pid}
          onChange={(event) => setForm((current) => ({ ...current, pid: event.target.value }))}
          required
          fullWidth
        >
          {products.map((product) => (
            <MenuItem key={product.pid} value={String(product.pid)}>
              {product.pname} · {formatMoney(product.price)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Order date"
          type="date"
          value={form.orderDate}
          onChange={(event) => setForm((current) => ({ ...current, orderDate: event.target.value }))}
          required
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete order"
        message={
          pendingDelete
            ? `Delete order #${pendingDelete.oid} for ${pendingDelete.uname}?`
            : ""
        }
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
      <NoticeSnackbar notice={notice} onClose={() => setNotice(null)} />
    </Stack>
  );
}
