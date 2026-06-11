import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { ConsoleLogDrawer } from "./components/ConsoleLogDrawer";

// Mount ConsoleLogDrawer in its own root before the main app so it can capture
// errors that occur during App's initial render. No flushSync needed — at module
// load time React renders synchronously on the first paint anyway.
const drawerContainer = document.getElementById("console-log-drawer-root") as HTMLElement;
createRoot(drawerContainer).render(<ConsoleLogDrawer />);

const container = document.getElementById("root") as HTMLElement;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
