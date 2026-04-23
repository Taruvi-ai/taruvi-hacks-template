import "./utils/clientLogger";

import React from "react";
import { createRoot } from "react-dom/client";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import App from "./App";
import { ConsoleLogDrawer } from "./components";

const container = document.getElementById("root") as HTMLElement;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const drawerContainer = document.createElement("div");
drawerContainer.id = "error-drawer-root";
document.body.appendChild(drawerContainer);
createRoot(drawerContainer).render(
  <React.StrictMode>
    <ThemeProvider theme={createTheme()}>
      <ConsoleLogDrawer />
    </ThemeProvider>
  </React.StrictMode>
);
