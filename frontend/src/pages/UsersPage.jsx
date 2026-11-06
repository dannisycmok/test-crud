import { useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Box,
  Button,
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
import { addUser, deleteUser, getUsers, updateUser } from "../api";
import ConfirmDialog from "../components/ConfirmDialog";
import FormDialog from "../components/FormDialog";
import NoticeSnackbar from "../components/NoticeSnackbar";
import { useResource } from "../hooks/useResource";

const emptyForm = { uname: "", email: "", password: "" };
const rowsPerPage = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loadUsers() {
  return getUsers();
}

function validateUser(form, isEditing) {
  const uname = form.uname.trim();
  const email = form.email.trim();
  if (!uname) {
    return "Name is required";
  }
  if (uname.length > 80) {
    return "Name must be at most 80 characters";
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return "Enter a valid email address";
  }
  if (!isEditing && form.password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (form.password && (form.password.length < 6 || form.password.length > 72)) {
    return "Password must be between 6 and 72 characters";
  }
  return "";
}

export default function UsersPage() {
  const { rows, loading, loadError, reload } = useResource(loadUsers);
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
    return rows.filter((user) => `${user.uname} ${user.email}`.toLowerCase().includes(needle));
  }, [rows, query]);

  const visible = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ uname: user.uname, email: user.email, password: "" });
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
    const validationError = validateUser(form, Boolean(editing));
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      uname: form.uname.trim(),
      email: form.email.trim(),
    };
    if (form.password) {
      payload.password = form.password;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await updateUser(editing.uid, payload);
        setNotice({ severity: "success", message: "User updated" });
      } else {
        await addUser({ ...payload, password: form.password });
        setNotice({ severity: "success", message: "User added" });
      }
      setDialogOpen(false);
      await reload();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the user");
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
      await deleteUser(pendingDelete.uid);
      setNotice({ severity: "success", message: "User deleted" });
      setPendingDelete(null);
      await reload();
    } catch (error) {
      setNotice({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete the user",
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
          <Typography variant="h4">Users</Typography>
          <Typography color="text.secondary">
            Passwords are hashed before they are stored and are never shown again.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add user
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <TextField
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search by name or email"
          size="small"
          fullWidth
          slotProps={{ htmlInput: { "aria-label": "Search users" } }}
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
            <CircularProgress aria-label="Loading users" />
          </Box>
        ) : (
          <>
            <Table sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography color="text.secondary" sx={{ py: 2 }}>
                        {rows.length === 0 ? "No users yet." : "No users match your search."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((user) => (
                    <TableRow key={user.uid} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{user.uname}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{user.uid}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell align="right">
                        <IconButton aria-label={`Edit ${user.uname}`} onClick={() => openEdit(user)}>
                          <EditOutlinedIcon />
                        </IconButton>
                        <IconButton
                          aria-label={`Delete ${user.uname}`}
                          color="error"
                          onClick={() => setPendingDelete(user)}
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
        title={editing ? "Edit user" : "Add user"}
        error={formError}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField label="Name" value={form.uname} onChange={updateField("uname")} required autoFocus fullWidth />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={updateField("email")}
          required
          fullWidth
        />
        <TextField
          label={editing ? "New password" : "Password"}
          type="password"
          value={form.password}
          onChange={updateField("password")}
          required={!editing}
          fullWidth
          helperText={editing ? "Leave blank to keep the current password." : "At least 6 characters."}
          autoComplete="new-password"
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete user"
        message={
          pendingDelete
            ? `Delete ${pendingDelete.uname}? This is blocked while orders still reference this user.`
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
