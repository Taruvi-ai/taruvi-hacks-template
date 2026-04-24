import React from "react";
import { createRoot, flushSync } from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import App from "./App";
import { ConsoleLogDrawer } from "./components";

// Mount and flush the drawer synchronously first so its useSyncExternalStore
// listener is registered before the main app renders and can potentially crash.
const drawerContainer = document.createElement("div");
drawerContainer.id = "error-drawer-root";
document.body.appendChild(drawerContainer);
flushSync(() => {
  createRoot(drawerContainer).render(
    <ThemeProvider theme={createTheme()}>
      <ConsoleLogDrawer />
    </ThemeProvider>
  );
});

const container = document.getElementById("root") as HTMLElement;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
