#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { convertMarkdownToPdf, convertFileToPdf, parseMarkdown } from "../engine/index.js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";

// ── MCP Server Setup ────────────────────────────────────────────────────────

const server = new McpServer({
  name: "md-2-pdf",
  version: "1.0.0",
});

// ── Tool 1: Convert Markdown text to PDF ────────────────────────────────────

server.tool(
  "convert-markdown-to-pdf",
  "Convert Markdown text content to a PDF document. Supports frontmatter metadata (title, author, subject, keywords) and customization options.",
  {
    markdown: z
      .string()
      .describe("The Markdown content to convert to PDF"),
    outputPath: z
      .string()
      .optional()
      .describe("Optional output file path for the PDF. If not provided, a temp path will be used."),
    pageSize: z
      .enum(["A4", "Letter", "Legal"])
      .optional()
      .describe("Page size for the PDF. Default: A4"),
    orientation: z
      .enum(["portrait", "landscape"])
      .optional()
      .describe("Page orientation. Default: portrait"),
    fontSize: z
      .number()
      .optional()
      .describe("Base font size in pixels. Default: 14"),
    fontFamily: z
      .string()
      .optional()
      .describe("Font family for the document"),
    marginTop: z.string().optional().describe("Top margin (e.g. '20mm')"),
    marginRight: z.string().optional().describe("Right margin (e.g. '15mm')"),
    marginBottom: z.string().optional().describe("Bottom margin (e.g. '20mm')"),
    marginLeft: z.string().optional().describe("Left margin (e.g. '15mm')"),
    customCss: z
      .string()
      .optional()
      .describe("Additional CSS to inject into the PDF"),
  },
  async (params) => {
    try {
      const {
        markdown,
        outputPath,
        pageSize,
        orientation,
        fontSize,
        fontFamily,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        customCss,
      } = params;

      const options = {
        pageSize: pageSize || "A4",
        orientation: orientation || "portrait",
        fontSize,
        fontFamily,
        margin: {
          top: marginTop,
          right: marginRight,
          bottom: marginBottom,
          left: marginLeft,
        },
        css: customCss,
      };

      const result = await convertMarkdownToPdf(markdown, options);

      if (!result.success || !result.buffer) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Conversion failed - ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      // Save to file if outputPath provided
      if (outputPath) {
        await mkdir(join(outputPath, "..").replace(/\\[^\\]*$/, ""), {
          recursive: true,
        });
        const fs = await import("node:fs/promises");
        await fs.writeFile(outputPath, result.buffer);
      }

      const metadataStr = result.metadata.title
        ? `\nMetadata: title="${result.metadata.title}", author="${result.metadata.author || "N/A"}"`
        : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully converted Markdown to PDF (${result.buffer.length} bytes)${metadataStr}${outputPath ? `\nSaved to: ${outputPath}` : "\nPDF returned as buffer."}`,
          },
          {
            type: "resource" as const,
            resource: {
              uri: `pdf://${uuidv4()}`,
              mimeType: "application/pdf",
              text: result.buffer.toString("base64"),
            },
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 2: Convert Markdown file to PDF file ──────────────────────────────

server.tool(
  "convert-markdown-file-to-pdf",
  "Convert a Markdown file on disk to a PDF file. Reads the input .md file and writes a .pdf file.",
  {
    inputPath: z
      .string()
      .describe("Absolute path to the input Markdown file"),
    outputPath: z
      .string()
      .optional()
      .describe("Output path for the PDF file. Defaults to same directory as input with .pdf extension"),
    pageSize: z
      .enum(["A4", "Letter", "Legal"])
      .optional()
      .describe("Page size. Default: A4"),
    orientation: z
      .enum(["portrait", "landscape"])
      .optional()
      .describe("Page orientation. Default: portrait"),
  },
  async (params) => {
    try {
      const { inputPath, outputPath, pageSize, orientation } = params;

      const finalOutput =
        outputPath || inputPath.replace(/\.(md|markdown)$/i, ".pdf");

      const options = {
        pageSize: pageSize || "A4",
        orientation: orientation || "portrait",
      };

      const result = await convertFileToPdf(inputPath, finalOutput, options);

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Conversion failed - ${result.error}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Successfully converted "${inputPath}" to "${result.outputPath}"${
              result.metadata.title ? `\nTitle: ${result.metadata.title}` : ""
            }${result.metadata.author ? `\nAuthor: ${result.metadata.author}` : ""}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 3: Parse Markdown and extract metadata ────────────────────────────

server.tool(
  "parse-markdown-metadata",
  "Parse Markdown content with frontmatter and extract metadata (title, author, subject, keywords, date) without converting to PDF.",
  {
    markdown: z
      .string()
      .describe("Markdown content with optional YAML frontmatter"),
  },
  async ({ markdown }) => {
    try {
      const { metadata } = parseMarkdown(markdown);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                metadata,
                hasFrontmatter:
                  markdown.trimStart().startsWith("---"),
                contentLength: markdown.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Start MCP Server ────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[md-2-pdf] MCP Server running on stdio");
}

main().catch((error) => {
  console.error("[md-2-pdf] Fatal error:", error);
  process.exit(1);
});
