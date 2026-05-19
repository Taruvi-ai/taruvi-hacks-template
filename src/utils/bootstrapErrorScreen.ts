/**
 * Vanilla-DOM error UI used when the app fails *before React mounts* —
 * typically a SyntaxError on a static module import (e.g. importing
 * `useDataGrid` from `@refinedev/core` instead of `@refinedev/mui`).
 *
 * `<ErrorBoundary>` only catches render-time errors inside React's tree;
 * module-load failures never reach it because React doesn't mount. This
 * file plugs that gap with a renderer that has zero runtime dependencies
 * (no MUI, no Refine) so it works even when those modules are the ones
 * failing to load.
 *
 * Visual language mirrors `src/components/ErrorBoundary.tsx` (Taruvi
 * tokens, Quicksand titles, error red left rail, monospace stack).
 */

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));

const TPL = `
<div style="font-family:'Open Sans',system-ui,sans-serif;min-height:60vh;display:flex;align-items:center;justify-content:center;padding:32px;color:#121414;">
  <div style="max-width:720px;width:100%;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:8px;padding:32px 40px;position:relative;overflow:hidden;">
    <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:#c2185b;"></div>

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <span style="text-transform:uppercase;letter-spacing:0.14em;font-size:11px;font-weight:700;color:#c2185b;line-height:1;">Error</span>
      <span style="width:3px;height:3px;border-radius:50%;background:#929C9F;"></span>
      <span style="text-transform:uppercase;letter-spacing:0.10em;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#596365;line-height:1;">__NAME__</span>
    </div>

    <h1 style="font-family:'Quicksand',system-ui,sans-serif;font-size:28px;font-weight:600;letter-spacing:-0.015em;margin:0 0 12px;">
      The app couldn&rsquo;t start.
    </h1>
    <p style="color:#596365;font-size:16px;line-height:1.55;margin:0 0 24px;max-width:56ch;">
      A module failed to load. This usually means a bad <code style="font-family:ui-monospace,Menlo,monospace;font-size:0.95em;">import</code> &mdash; for example importing <code style="font-family:ui-monospace,Menlo,monospace;font-size:0.95em;">useDataGrid</code> from <code style="font-family:ui-monospace,Menlo,monospace;font-size:0.95em;">@refinedev/core</code> when it lives in <code style="font-family:ui-monospace,Menlo,monospace;font-size:0.95em;">@refinedev/mui</code>. Fix the import in your editor and the page will reload.
    </p>

    <div style="border-left:2px solid #c2185b;background:rgba(194,24,91,0.04);padding:12px 16px;border-radius:0 4px 4px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;word-break:break-word;margin-bottom:24px;">
      __MESSAGE__
    </div>

    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <button id="__taruvi_bootstrap_reload" style="background:#1E88E5;color:#fff;border:none;font-family:'Quicksand',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;line-height:1.2;">
        Reload
      </button>
      <button id="__taruvi_bootstrap_copy" style="background:transparent;color:#121414;border:1.5px solid rgba(0,0,0,0.16);font-family:'Quicksand',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px;line-height:1.2;">
        Copy details
      </button>
    </div>

    <details style="margin-top:24px;color:#596365;">
      <summary style="cursor:pointer;font-size:13px;font-family:'Quicksand',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#596365;">Show technical details</summary>
      <pre style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:1.65;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow:auto;padding:16px;background:rgba(18,20,20,0.04);border:1px solid rgba(0,0,0,0.06);border-radius:6px;margin:12px 0 0;color:#596365;">__STACK__</pre>
    </details>
  </div>
</div>
`;

/**
 * Inject the bootstrap error UI into the given container. Safe to call
 * multiple times — replaces any previous content.
 */
export const showBootstrapError = (
  container: HTMLElement,
  err: unknown,
): void => {
  const e = err instanceof Error ? err : new Error(String(err));
  const stack = e.stack || `${e.name}: ${e.message}`;

  // eslint-disable-next-line no-console
  console.error("[bootstrap] uncaught error", e);

  container.innerHTML = TPL
    .replace("__NAME__", escapeHtml(e.name || "Error"))
    .replace("__MESSAGE__", escapeHtml(e.message || "An unknown error occurred."))
    .replace("__STACK__", escapeHtml(stack));

  const reload = container.querySelector<HTMLButtonElement>("#__taruvi_bootstrap_reload");
  reload?.addEventListener("click", () => window.location.reload());

  const copy = container.querySelector<HTMLButtonElement>("#__taruvi_bootstrap_copy");
  copy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(stack);
      copy.textContent = "Copied";
      setTimeout(() => { copy.textContent = "Copy details"; }, 1500);
    } catch {
      /* clipboard API can fail in dev sandboxes — silently degrade */
    }
  });
};
