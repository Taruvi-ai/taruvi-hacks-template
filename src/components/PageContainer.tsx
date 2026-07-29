import { Container, ContainerProps } from "@mui/material";

/**
 * Shared page wrapper for list / show / create / edit views.
 *
 * Centralizes page-level padding so every generated app is consistent.
 * The app layout (`ThemedLayout` in App.tsx) applies no content padding, so
 * page padding lives here — one place — instead of being copy-pasted per page.
 *
 * Defaults to a compact `maxWidth="lg"` container with 24px padding.
 * Override `maxWidth` or `sx` when a page genuinely needs it.
 */
export const PageContainer = ({ children, sx, maxWidth = "lg", ...rest }: ContainerProps) => (
  <Container maxWidth={maxWidth} sx={{ py: 3, px: 3, ...sx }} {...rest}>
    {children}
  </Container>
);
