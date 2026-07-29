import { Container, ContainerProps } from "@mui/material";

/**
 * Shared page wrapper for list / show / create / edit views.
 *
 * Centralizes page-level padding so every generated app is consistent.
 * The app layout (`ThemedLayout` in App.tsx) applies no content padding, so
 * page padding lives here — one place — instead of being copy-pasted per page.
 *
 * Defaults to a full-width container (`maxWidth={false}`) so content fills the
 * available space rather than being capped at ~1200px and centered — the capped
 * layout leaves large side gutters on wide screens that read as heavy padding.
 * Only a compact 24px padding is applied. Pass `maxWidth="lg"` (or `sx`) on the
 * rare page that genuinely wants a centered, width-limited column.
 */
export const PageContainer = ({ children, sx, maxWidth = false, ...rest }: ContainerProps) => (
  <Container maxWidth={maxWidth} sx={{ py: 3, px: 3, ...sx }} {...rest}>
    {children}
  </Container>
);
