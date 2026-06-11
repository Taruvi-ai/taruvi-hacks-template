import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UNSAFE_NavigationContext as NavigationContext, useLocation } from "react-router";
import { useTranslate, useWarnAboutChange } from "@refinedev/core";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

/**
 * Replaces Refine's UnsavedChangesNotifier with a MUI Dialog
 * instead of window.confirm for in-app navigation.
 * Browser tab close/refresh still uses the native beforeunload prompt
 * (browsers don't allow custom UI for that).
 */
export const UnsavedChangesDialog: React.FC = () => {
  const translate = useTranslate();
  const { pathname } = useLocation();
  const { warnWhen, setWarnWhen } = useWarnAboutChange();
  const { navigator } = useContext(NavigationContext);

  const [open, setOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);

  const message = useMemo(
    () => translate("warnWhenUnsavedChanges", "Are you sure you want to leave? You have unsaved changes."),
    [translate],
  );

  // Reset warnWhen on route change
  useEffect(() => {
    return () => setWarnWhen?.(false);
  }, [pathname]);

  // Keep beforeunload for tab close/refresh (browser requirement)
  useEffect(() => {
    if (!warnWhen) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [warnWhen, message]);

  // Intercept in-app navigation with dialog instead of window.confirm
  useEffect(() => {
    if (!warnWhen) return;

    const originalPush = navigator.push;
    const originalGo = navigator.go;

    navigator.push = (...args: Parameters<typeof originalPush>) => {
      setPendingNav(() => () => {
        navigator.push = originalPush;
        originalPush(...args);
      });
      setOpen(true);
    };

    navigator.go = (...args: Parameters<typeof originalGo>) => {
      setPendingNav(() => () => {
        navigator.go = originalGo;
        originalGo(...args);
      });
      setOpen(true);
    };

    return () => {
      navigator.push = originalPush;
      navigator.go = originalGo;
    };
  }, [navigator, warnWhen]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    setPendingNav(null);
  }, []);

  const handleLeave = useCallback(() => {
    setWarnWhen?.(false);
    setOpen(false);
    pendingNav?.();
    setPendingNav(null);
  }, [pendingNav, setWarnWhen]);

  return (
    <Dialog open={open} onClose={handleCancel}>
      <DialogTitle>Unsaved Changes</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button color="error" onClick={handleLeave}>Leave</Button>
      </DialogActions>
    </Dialog>
  );
};
