import { Box, Typography, Container, Stack, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const Home = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Mirrors the design system "cover" gradient (sky-blue brand).
  const coverBackground = isDark
    ? "linear-gradient(135deg, #002A3C 0%, #004369 55%, #056A8F 100%)"
    : "linear-gradient(135deg, #dce9f5 0%, #5ab4f0 60%, #2b97ff 100%)";

  return (
    <Container maxWidth={false} disableGutters>
      <Box
        sx={{
          minHeight: "calc(100vh - var(--nav-height, 60px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: coverBackground,
          position: "relative",
          overflow: "hidden",
          px: { xs: 4, md: 8 },
          py: { xs: 6, md: 10 },
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)",
            pointerEvents: "none",
          },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={{ xs: 4, md: 6 }}
          sx={{
            width: "100%",
            maxWidth: 1200,
            zIndex: 1,
            animation: `${fadeIn} 0.8s ease-out`,
          }}
        >
          <Box>
            <Typography
              component="div"
              sx={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 300,
                color: "#fff",
                fontSize: { xs: "2.5rem", sm: "3.25rem", md: "3.625rem" },
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                mb: 2,
              }}
            >
              Taruvi
              <br />
              Design
              <br />
              System
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Open Sans', sans-serif",
                fontSize: { xs: "0.9375rem", md: "1.0625rem" },
                fontWeight: 400,
                maxWidth: 420,
              }}
            >
              Welcome to your Taruvi template — branded with the Taruvi design system.
            </Typography>
          </Box>

          {/* Cover type-demo: outlined A / a (Quicksand) */}
          <Stack
            direction="row"
            alignItems="flex-end"
            spacing={1.5}
            sx={{
              display: { xs: "none", md: "flex" },
              opacity: 0.85,
              fontFamily: "'Quicksand', sans-serif",
              lineHeight: 1,
            }}
          >
            <Box
              component="span"
              sx={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 200,
                fontSize: 180,
                lineHeight: 1,
                WebkitTextStroke: "2px rgba(255,255,255,0.85)",
                WebkitTextFillColor: "transparent",
                border: "3px solid rgba(255,255,255,0.6)",
                px: 1,
              }}
            >
              A
            </Box>
            <Box
              component="span"
              sx={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                fontSize: 140,
                lineHeight: 1,
                WebkitTextStroke: "2px rgba(255,255,255,0.85)",
                WebkitTextFillColor: "transparent",
              }}
            >
              a
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
};
