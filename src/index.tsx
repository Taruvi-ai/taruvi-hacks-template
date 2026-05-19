import React from "react";
import { createRoot } from "react-dom/client";
import { showBootstrapError } from "./utils/bootstrapErrorScreen";

/**
 * Two-layer error handling:
 *
 *   1. `<ErrorBoundary>` (src/components/ErrorBoundary.tsx) catches
 *      render-time errors inside React's tree.
 *
 *   2. This file catches errors that fire *before* or *outside* the
 *      React tree — most importantly **module-load failures** (e.g.,
 *      a SyntaxError on a static `import` that means the bundle never
 *      gets to mount React in the first place).
 *
 * The `import("./App")` below is intentional: it makes App's entire
 * transitive module graph evaluate *after* the window error listeners
 * are attached, so any uncaught failure during App's import surfaces
 * as a promise rejection we can render the fallback for.
 */

const container = document.getElementById("root") as HTMLElement;

let reactMounted = false;

window.addEventListener("error", (ev) => {
  if (reactMounted) return; // let ErrorBoundary handle render errors
  showBootstrapError(container, ev.error ?? new Error(ev.message || "Unknown error"));
});

window.addEventListener("unhandledrejection", (ev) => {
  if (reactMounted) return;
  showBootstrapError(container, ev.reason);
});

import("./App")
  .then(({ default: App }) => {
    reactMounted = true; // gates the listeners above
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((err) => {
    // Most common path for the "missing export from a module" case
    showBootstrapError(container, err);
  });
