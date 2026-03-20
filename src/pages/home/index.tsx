import { Box, Typography, Container, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

export const Home = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Container maxWidth={false} disableGutters>
      <Box
        sx={{
          minHeight: "calc(100vh - var(--nav-height, 60px))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDark
            ? "linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)"
            : "linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #667eea)",
          backgroundSize: "400% 400%",
          animation: `${gradientShift} 15s ease infinite`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark
              ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 50%)"
              : "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)",
            pointerEvents: "none",
          },
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            zIndex: 1,
            animation: `${fadeIn} 1s ease-out`,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "3rem", sm: "4rem", md: "6rem" },
              fontWeight: 700,
              background: isDark
                ? "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)"
                : "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: isDark
                ? "0 4px 20px rgba(255,255,255,0.1)"
                : "0 4px 20px rgba(0,0,0,0.1)",
              mb: 2,
              letterSpacing: "-0.02em",
            }}
          >
            Hello
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: isDark ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.95)",
              fontWeight: 300,
              fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" },
              letterSpacing: "0.05em",
              animation: `${fadeIn} 1s ease-out 0.3s backwards`,
            }}
          >
            Welcome to your Taruvi template
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};
