import type { ReactNode } from "react";
import Box, { type BoxProps } from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

interface MarkdownTextProps extends Omit<BoxProps, "children"> {
  text: string;
  color?: string;
}

const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;

/** Render inline markdown: **bold**, *italic*, `code`, [links](url), and bare URLs. */
const renderInline = (text: string, _color?: string): ReactNode[] => {
  const tokens: ReactNode[] = [];
  // Combined pattern for inline elements:
  // 1: [text](url)  2: **bold**  3: *italic*  4: `code`  5: bare URL
  const inlinePattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|(https?:\/\/[^\s)]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlinePattern.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const key = `i-${match.index}`;
    if (match[1] !== undefined) {
      // [text](url)
      tokens.push(
        <Link key={key} href={match[2]} target="_blank" rel="noreferrer" underline="hover" sx={{ fontWeight: 600 }}>
          {match[1]}
        </Link>,
      );
    } else if (match[3] !== undefined) {
      // **bold**
      tokens.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      // *italic*
      tokens.push(<em key={key}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      // `code`
      tokens.push(
        <Box
          key={key}
          component="code"
          sx={{
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            bgcolor: "action.hover",
            fontFamily: "monospace",
            fontSize: "0.875em",
          }}
        >
          {match[5]}
        </Box>,
      );
    } else if (match[6] !== undefined) {
      // bare URL
      tokens.push(
        <Link key={key} href={match[6]} target="_blank" rel="noreferrer" underline="hover" sx={{ fontWeight: 600 }}>
          {match[6]}
        </Link>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
};

/** Parse markdown text into React elements using MUI components. */
const parseMarkdown = (text: string, color?: string): ReactNode[] => {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block (```)
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <Box
          key={`code-${i}`}
          component="pre"
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: "action.hover",
            fontFamily: "monospace",
            fontSize: "0.85em",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            my: 1,
          }}
        >
          {codeLines.join("\n")}
        </Box>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings (# through ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const variants = { 1: "h4", 2: "h5", 3: "h6", 4: "subtitle1", 5: "subtitle2", 6: "subtitle2" } as const;
      elements.push(
        <Typography key={`h-${i}`} variant={variants[level]} fontWeight={700} gutterBottom sx={{ mt: 1 }}>
          {renderInline(headingMatch[2], color)}
        </Typography>,
      );
      i++;
      continue;
    }

    // Blockquote (>)
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <Box
          key={`bq-${i}`}
          sx={{
            borderLeft: 3,
            borderColor: "divider",
            pl: 2,
            py: 0.5,
            my: 1,
            color: "text.secondary",
            fontStyle: "italic",
          }}
        >
          <Typography variant="body1">{renderInline(quoteLines.join(" "), "text.secondary")}</Typography>
        </Box>,
      );
      continue;
    }

    // Unordered list (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+/);
    if (ulMatch) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*[-*]\s+/, "");
        items.push(<li key={`li-${i}`}>{renderInline(content, color)}</li>);
        i++;
      }
      elements.push(
        <Box component="ul" key={`ul-${i}`} sx={{ my: 0.5, pl: 2, color }}>
          {items}
        </Box>,
      );
      continue;
    }

    // Ordered list (1. 2. etc.)
    const olMatch = line.match(/^\s*\d+\.\s+/);
    if (olMatch) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*\d+\.\s+/, "");
        items.push(<li key={`li-${i}`}>{renderInline(content, color)}</li>);
        i++;
      }
      elements.push(
        <Box component="ol" key={`ol-${i}`} sx={{ my: 0.5, pl: 2, color }}>
          {items}
        </Box>,
      );
      continue;
    }

    // Horizontal rule (---, ***, ___)
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      elements.push(<Box key={`hr-${i}`} component="hr" sx={{ my: 2, border: 0, borderTop: 1, borderColor: "divider" }} />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <Typography key={`p-${i}`} variant="body1" color={color} gutterBottom>
        {renderInline(line, color)}
      </Typography>,
    );
    i++;
  }

  return elements;
};

export const MarkdownText = ({ text, color, sx, ...boxProps }: MarkdownTextProps) => (
  <Box sx={{ "& > *:first-of-type": { mt: 0 }, "& > *:last-child": { mb: 0 }, ...sx }} {...boxProps}>
    {parseMarkdown(text, color)}
  </Box>
);
