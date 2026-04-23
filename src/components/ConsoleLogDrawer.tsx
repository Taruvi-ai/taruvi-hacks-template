import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { getLastBoundaryAt, getSnapshot, subscribe, type LogEntry } from "../utils/clientLogger";

type SnackbarState = {
  type: "error" | "success";
  message: string;
  description: string;
};

const BOUNDARY_SUPPRESS_WINDOW_MS = 1500;

const formatEntry = (entry: LogEntry) => {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  return `[${time}] [${entry.source}] ${entry.text}`;
};

const copyText = async (text: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard access is not available in this browser.");
  }
  await navigator.clipboard.writeText(text);
};

export const ConsoleLogDrawer = () => {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (entries.length > previousCountRef.current) {
      const latestEntry = entries[entries.length - 1];
      const boundaryActive =
        latestEntry?.source === "react-error-boundary" ||
        Date.now() - getLastBoundaryAt() < BOUNDARY_SUPPRESS_WINDOW_MS;
      if (!boundaryActive) {
        setIsOpen(true);
        setSnackbar({
          type: "error",
          message: "Application error detected",
          description: latestEntry ? latestEntry.text.slice(0, 160) : "Open the error panel for details.",
        });
      }
    }
    previousCountRef.current = entries.length;
  }, [entries]);

  const latestEntry = useMemo(() => entries[entries.length - 1] ?? null, [entries]);

  const handleCopyVisible = async () => {
    const text = latestEntry ? formatEntry(latestEntry) : "";
    if (!text) {
      setSnackbar({ type: "error", message: "No error to copy", description: "There is no captured error yet." });
      return;
    }
    try {
      await copyText(text);
      setSnackbar({ type: "success", message: "Error copied", description: "The latest error is in your clipboard." });
    } catch (error) {
      setSnackbar({ type: "error", message: "Copy failed", description: error instanceof Error ? error.message : String(error) });
    }
  };

  if (entries.length === 0 && !isOpen && !snackbar) {
    return null;
  }

  return (
    <>
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: { xs: 220, md: 240 },
        },
      }}
    >
      <DialogContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3 }}>
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            p: 2,
            borderColor: "error.main",
            bgcolor: "error.light",
            color: "error.contrastText",
          }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="pre"
                variant="body2"
                sx={{
                  m: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "Monaco, Consolas, 'Courier New', monospace",
                }}
              >
                {latestEntry?.text ?? "Unknown error"}
              </Typography>
            </Box>
            <Tooltip title="Copy error">
              <IconButton onClick={handleCopyVisible} sx={{ color: "inherit", flexShrink: 0 }}>
                <ContentCopyRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => setIsOpen(false)} variant="contained" color="error">
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>

    <Snackbar
      open={!!snackbar}
      autoHideDuration={4000}
      onClose={() => setSnackbar(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert severity={snackbar?.type ?? "error"} onClose={() => setSnackbar(null)} sx={{ width: "100%" }}>
        <AlertTitle>{snackbar?.message}</AlertTitle>
        {snackbar?.description}
      </Alert>
    </Snackbar>
    </>
  );
};
