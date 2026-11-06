import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
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
import { addProduct, deleteProduct, getProducts, updateProduct } from "../api";
import ConfirmDialog from "../components/ConfirmDialog";
import FormDialog from "../components/FormDialog";
import NoticeSnackbar from "../components/NoticeSnackbar";
import { formatMoney } from "../format";
import { useResource } from "../hooks/useResource";

const emptyForm = { pname: "", description: "", price: "", qty: "" };
const rowsPerPage = 8;

function loadProducts() {
  return getProducts();
}

function validateProduct(form) {
  const pname = form.pname.trim();
  const description = form.description.trim();
  if (!pname) {
    return "Product name is required";
  }
  if (pname.length > 120) {
    return "Product name must be at most 120 characters";
  }
  if (description.length > 1000) {
    return "Description must be at most 1000 characters";
  }
  if (form.price === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
    return "Price must be 0 or greater";
  }
  if (form.qty === "" || !Number.isInteger(Number(form.qty)) || Number(form.qty) < 0) {
    return "Quantity must be a whole number, 0 or greater";
  }
  return "";
}

export default function ProductsPage() {
  const { rows, loading, loadError, reload } = useResource(loadProducts);
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter((product) =>
      `${product.pname} ${product.description}`.toLowerCase().includes(needle)
    );
  }, [rows, query]);

  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      pname: product.pname,
      description: product.description ?? "",
      price: String(product.price),
      qty: String(product.qty),
    });
    setFormError("");
    setDialogOpen(true);
  }

  function updateField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateProduct(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      pname: form.pname.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      qty: Number(form.qty),
    };

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateProduct(editing.pid, payload);
        setNotice({ severity: "success", message: "Product updated" });
      } else {
        await addProduct(payload);
        setNotice({ severity: "success", message: "Product added" });
      }
      setDialogOpen(false);
      await reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the product");
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
      await deleteProduct(pendingDelete.pid);
      setNotice({ severity: "success", message: "Product deleted" });
      setPendingDelete(null);
      await reload();
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete the product",
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
          <Typography variant="h4">Products</Typography>
          <Typography color="text.secondary">Name, description, price, and quantity on hand.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add product
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <TextField
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search by name or description"
          size="small"
          fullWidth
          slotProps={{ htmlInput: { "aria-label": "Search products" } }}
        />
      </Paper>

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
            <CircularProgress aria-label="Loading products" />
          </Box>
        ) : (
          <>
            <Table size="medium" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        {rows.length === 0 ? "No products yet." : "No products match your search."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((product) => (
                    <TableRow key={product.pid} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{product.pname}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{product.pid}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography noWrap title={product.description}>
                          {product.description || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatMoney(product.price)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          variant="outlined"
                          label={product.qty}
                          color={product.qty === 0 ? "error" : product.qty <= 5 ? "warning" : "success"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton aria-label={`Edit ${product.pname}`} onClick={() => openEdit(product)}>
                          <EditOutlinedIcon />
                        </IconButton>
                        <IconButton
                          aria-label={`Delete ${product.pname}`}
                          color="error"
                          onClick={() => setPendingDelete(product)}
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
              page={page}
              onPageChange={(_event, nextPage) => setPage(nextPage)}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
            />
          </>
        )}
      </TableContainer>

      <FormDialog
        open={dialogOpen}
        title={editing ? "Edit product" : "Add product"}
        error={formError}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Name"
          value={form.pname}
          onChange={updateField("pname")}
          required
          autoFocus
          fullWidth
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={updateField("description")}
          fullWidth
          multiline
          minRows={3}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Price"
            value={form.price}
            onChange={updateField("price")}
            type="number"
            required
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
          />
          <TextField
            label="Quantity"
            value={form.qty}
            onChange={updateField("qty")}
            type="number"
            required
            fullWidth
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
          />
        </Stack>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        message={
          pendingDelete
            ? `Delete ${pendingDelete.pname}? This is blocked while orders still reference it.`
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
