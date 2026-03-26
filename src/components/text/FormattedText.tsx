import type { ReactNode } from "react";
import Link from "@mui/material/Link";
import Typography, { type TypographyProps } from "@mui/material/Typography";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const renderLinkedText = (value: string): ReactNode[] => {
  const parts = value.split(URL_PATTERN);

  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <Link
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          {part}
        </Link>
      );
    }

    return <span key={`${index}-${part}`}>{part}</span>;
  });
};

interface FormattedTextProps extends Omit<TypographyProps, "children"> {
  text: string;
}

export const FormattedText = ({ text, sx, ...typographyProps }: FormattedTextProps) => (
  <Typography
    {...typographyProps}
    sx={{
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      ...sx,
    }}
  >
    {renderLinkedText(text)}
  </Typography>
);
