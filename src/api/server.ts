import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  convertMarkdownToPdf,
  convertFileToPdf,
  parseMarkdown,
  markdownToHtml,
} from "../engine/index.js";
import type { ConversionOptions, PdfMetadata } from "../engine/index.js";
import { initializeDatabase } from "../db/database.js";
import { DocumentModel } from "../db/models/document.js";
import { optionalAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import historyRoutes from "./routes/history.js";

initializeDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(join(process.cwd(), "public")));
app.use("/node_modules", express.static(join(process.cwd(), "node_modules")));

interface ConvertBody {
  markdown: string;
  options?: ConversionOptions;
}

interface ConvertFileResponse {
  success: boolean;
  message: string;
  metadata?: PdfMetadata;
  outputPath?: string;
  pdfBase64?: string;
}

app.get("/", (_req, res) => {
  res.sendFile(join(process.cwd(), "public", "index.html"));
});

app.get("/docs", (_req, res) => {
  res.sendFile(join(process.cwd(), "public", "docs.html"));
});

app.get("/history", (_req, res) => {
  res.sendFile(join(process.cwd(), "public", "history.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "md-2-pdf",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/docs", (_req, res) => {
  res.json({
    version: "2.0.0",
    baseUrl: "/api",
    endpoints: [
      {
        method: "GET",
        path: "/api/health",
        description: "فحص صحة الخادم",
      },
      {
        method: "POST",
        path: "/api/convert",
        description: "تحويل Markdown إلى PDF",
      },
      {
        method: "POST",
        path: "/api/convert/base64",
        description: "تحويل إلى PDF (base64)",
      },
      {
        method: "POST",
        path: "/api/convert/file",
        description: "تحويل وحفظ على الخادم",
      },
      {
        method: "POST",
        path: "/api/parse",
        description: "تحليل Markdown",
      },
      {
        method: "GET",
        path: "/api/history",
        description: "جلب سجلات المستندات",
      },
      {
        method: "POST",
        path: "/api/auth/register",
        description: "تسجيل مستخدم جديد",
      },
      {
        method: "POST",
        path: "/api/auth/login",
        description: "تسجيل الدخول",
      },
      {
        method: "POST",
        path: "/api/auth/guest",
        description: "إنشاء جلسة ضيف",
      },
    ],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/history", optionalAuth, historyRoutes);

app.post<Record<string, never>, unknown, ConvertBody>(
  "/api/convert",
  optionalAuth,
  async (req, res) => {
    try {
      const { markdown, options = {} } = req.body;

      if (!markdown || typeof markdown !== "string") {
        res.status(400).json({
          success: false,
          error: "Missing or invalid 'markdown' field in request body",
        });
        return;
      }

      if (markdown.length > 5 * 1024 * 1024) {
        res.status(413).json({
          success: false,
          error: "Markdown content exceeds 5MB limit",
        });
        return;
      }

      const result = await convertMarkdownToPdf(markdown, options);

      if (!result.success || !result.buffer) {
        res.status(500).json({
          success: false,
          error: result.error || "Conversion failed",
        });
        return;
      }

      const filename = `document-${uuidv4()}.pdf`;

      try {
        DocumentModel.create({
          user_id: (req as any).userId || null,
          guest_session_id: (req as any).guestSessionId || null,
          title: options.title || result.metadata.title || filename,
          filename: filename,
          markdown_content: markdown,
          markdown_size: Buffer.byteLength(markdown, "utf-8"),
          pdf_size: result.buffer.length,
          pdf_generated: true,
          theme: (options as any).theme || "blue",
          page_size: options.pageSize || "A4",
          orientation: options.orientation || "portrait",
        });
      } catch (dbErr) {
        console.error("[db] Failed to log document:", dbErr);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("X-Metadata-Title", result.metadata.title || "");
      res.setHeader("X-Metadata-Author", result.metadata.author || "");

      res.send(result.buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
);

app.post<
  Record<string, never>,
  | { success: false; error: string }
  | ConvertFileResponse,
  ConvertBody
>("/api/convert/base64", async (req, res) => {
  try {
    const { markdown, options = {} } = req.body;

    if (!markdown || typeof markdown !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'markdown' field in request body",
      });
      return;
    }

    const result = await convertMarkdownToPdf(markdown, options);

    if (!result.success || !result.buffer) {
      res.status(500).json({
        success: false,
        error: result.error || "Conversion failed",
      });
      return;
    }

    res.json({
      success: true,
      message: "Conversion successful",
      metadata: result.metadata,
      pdfBase64: result.buffer.toString("base64"),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

app.post<
  Record<string, never>,
  | { success: false; error: string }
  | ConvertFileResponse,
  ConvertBody & { outputPath?: string }
>("/api/convert/file", async (req, res) => {
  try {
    const { markdown, options = {}, outputPath } = req.body;

    if (!markdown || typeof markdown !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'markdown' field in request body",
      });
      return;
    }

    const tempInput = join(process.cwd(), "uploads", `temp-${uuidv4()}.md`);
    await mkdir(join(process.cwd(), "uploads"), { recursive: true });
    await writeFile(tempInput, markdown, "utf-8");

    const finalOutput =
      outputPath || join(process.cwd(), "output", `doc-${uuidv4()}.pdf`);

    const result = await convertFileToPdf(tempInput, finalOutput, options);

    await unlink(tempInput).catch(() => {});

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || "Conversion failed",
      });
      return;
    }

    res.json({
      success: true,
      message: "PDF saved successfully",
      metadata: result.metadata,
      outputPath: result.outputPath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

app.post<
  Record<string, never>,
  | { success: false; error: string }
  | { success: true; metadata: PdfMetadata; html: string },
  { markdown: string }
>("/api/parse", async (req, res) => {
  try {
    const { markdown } = req.body;

    if (!markdown || typeof markdown !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'markdown' field in request body",
      });
      return;
    }

    const { metadata, content } = parseMarkdown(markdown);
    const html = markdownToHtml(content, metadata);

    res.json({
      success: true,
      metadata,
      html,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Parse error",
    });
  }
});

export function startApiServer(port?: number): void {
  const serverPort = port || PORT;
  app.listen(serverPort, () => {
    console.log(
      `[md-2-pdf] API Server running on http://localhost:${serverPort}`
    );
    console.log(
      `[md-2-pdf] Web Interface: http://localhost:${serverPort}`
    );
    console.log(
      `[md-2-pdf] API Docs: http://localhost:${serverPort}/docs`
    );
  });
}

export { app };
