import { Component, ErrorInfo, ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { reportError } from "../utils/clientLogger";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  error: Error | null;
  copied: boolean;
  expanded: boolean;
};

const formatError = (error: Error): string =>
  error.stack || `${error.name}: ${error.message}`;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false, expanded: false };
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError("react-error-boundary", [error], {
      component_stack: info.componentStack ?? "",
    });
  }

  componentWillUnmount(): void {
    if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
  }

  handleReset = (): void => {
    this.setState({ error: null, copied: false, expanded: false });
  };

  handleToggleDetails = (): void => {
    this.setState((prev) => ({ expanded: !prev.expanded }));
  };

  handleCopy = async (): Promise<void> => {
    const error = this.state.error;
    if (!error) return;
    const text = formatError(error);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      this.setState({ copied: true });
      if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
      this.copyResetTimer = setTimeout(() => this.setState({ copied: false }), 1500);
    } catch {
      /* silently fail — user can still select the text manually */
    }
  };

  render(): ReactNode {
    const { error, copied, expanded } = this.state;

    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <Container
        maxWidth="md"
        sx={{
          py: { xs: 4, md: 8 },
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            position: "relative",
            overflow: "hidden",
            borderRadius: 2,
            p: { xs: 3, md: 5 },
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              bgcolor: "error.main",
            }}
          />

          <Stack spacing={{ xs: 3, md: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography
                variant="overline"
                sx={{
                  color: "error.main",
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                Error
              </Typography>
              <Box
                sx={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  bgcolor: "text.disabled",
                }}
              />
              <Typography
                variant="overline"
                sx={{
                  color: "text.secondary",
                  letterSpacing: "0.1em",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  lineHeight: 1,
                }}
              >
                {error.name || "Error"}
              </Typography>
            </Stack>

            <Stack spacing={1.25}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}
              >
                This page hit a snag.
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", maxWidth: "56ch" }}
              >
                One of the components on this page couldn&apos;t render. The rest of
                the app is fine — you can retry, or copy the details to share with
                whoever is helping you.
              </Typography>
            </Stack>

            <Box
              sx={(theme) => ({
                pl: 2,
                py: 1.25,
                borderLeft: `2px solid ${theme.palette.error.main}`,
                bgcolor: alpha(
                  theme.palette.error.main,
                  theme.palette.mode === "dark" ? 0.08 : 0.04,
                ),
                borderRadius: "0 4px 4px 0",
              })}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  color: "text.primary",
                  wordBreak: "break-word",
                  lineHeight: 1.6,
                }}
              >
                {error.message || "An unknown error occurred."}
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Button
                variant="contained"
                color="primary"
                size="medium"
                startIcon={<RefreshRoundedIcon />}
                onClick={this.handleReset}
                disableElevation
              >
                Try again
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="medium"
                startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                onClick={this.handleCopy}
                sx={{
                  color: "text.primary",
                  borderColor: "divider",
                  "&:hover": { borderColor: "text.secondary", bgcolor: "action.hover" },
                }}
              >
                {copied ? "Copied" : "Copy details"}
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={this.handleToggleDetails}
                aria-expanded={expanded}
                endIcon={
                  <ExpandMoreRoundedIcon
                    sx={{
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 200ms ease-out",
                    }}
                  />
                }
                sx={{
                  ml: { sm: "auto" },
                  color: "text.secondary",
                  fontWeight: 500,
                  "&:hover": { bgcolor: "transparent", color: "text.primary" },
                }}
              >
                {expanded ? "Hide technical details" : "Show technical details"}
              </Button>
            </Stack>

            <Collapse in={expanded} timeout={250} unmountOnExit>
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  p: 2,
                  maxHeight: 320,
                  overflow: "auto",
                  borderRadius: 1.5,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.common.black, 0.35)
                      : alpha(theme.palette.text.primary, 0.035),
                  borderColor: "divider",
                })}
              >
                <Typography
                  component="pre"
                  sx={{
                    m: 0,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.78rem",
                    lineHeight: 1.65,
                    color: "text.secondary",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {formatError(error)}
                </Typography>
              </Paper>
            </Collapse>
          </Stack>
        </Paper>
      </Container>
    );
  }
}
