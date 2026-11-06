import { Alert, Snackbar } from "@mui/material";

/**
 * Brief success or error message after a create, update, or delete.
 */
export default function NoticeSnackbar({ notice, onClose }) {
  return (
    <Snackbar
      open={Boolean(notice)}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      {notice ? (
        <Alert severity={notice.severity} onClose={onClose} variant="filled" sx={{ width: "100%" }}>
          {notice.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
