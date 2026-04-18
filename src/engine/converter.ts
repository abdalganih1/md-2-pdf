import { marked } from "marked";
import hljs from "highlight.js";
import matter from "gray-matter";
import puppeteer from "puppeteer";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { v4 as uuidv4 } from "uuid";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  createdAt?: string;
}

export interface ConversionOptions {
  pageSize?: "A4" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  fontSize?: number;
  fontFamily?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  css?: string;
  title?: string;
  rtl?: boolean;
  theme?: string;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  buffer?: Buffer;
  metadata: PdfMetadata;
  error?: string;
}

// ── Markdown → HTML ─────────────────────────────────────────────────────────

const renderer = new marked.Renderer();

// Custom heading renderer with IDs for TOC
let headingCounter = 0;
renderer.heading = function ({ text, depth }) {
  const id = text
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A]+/g, "-")
    .replace(/^-|-$/g, "");
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

// Custom code block renderer with syntax highlighting
renderer.code = function ({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({ renderer });

/**
 * Parse markdown with frontmatter metadata
 */
export function parseMarkdown(markdownContent: string): {
  metadata: PdfMetadata;
  content: string;
} {
  const { data, content } = matter(markdownContent);

  const metadata: PdfMetadata = {
    title: data.title || undefined,
    author: data.author || undefined,
    subject: data.subject || undefined,
    keywords: data.keywords || undefined,
    createdAt: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
  };

  return { metadata, content };
}

/**
 * Convert markdown content to HTML
 */
export function markdownToHtml(
  markdown: string,
  metadata: PdfMetadata,
  options: ConversionOptions = {}
): string {
  const htmlBody = marked.parse(markdown) as string;

  const pageSize = options.pageSize || "A4";
  const fontSize = options.fontSize || 14;
  const fontFamily = options.fontFamily || "'Segoe UI', Tahoma, Arial, sans-serif";
  const marginTop = options.margin?.top || "20mm";
  const marginRight = options.margin?.right || "15mm";
  const marginBottom = options.margin?.bottom || "20mm";
  const marginLeft = options.margin?.left || "15mm";

  const customCss = options.css || "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${metadata.title ? `<title>${metadata.title}</title>` : ""}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Fira+Code:wght@400&display=swap');

    :root {
      --primary: #1a56db;
      --text: #1f2937;
      --bg: #ffffff;
      --code-bg: #f8fafc;
      --border: #e5e7eb;
      --heading-color: #111827;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${fontFamily}, 'Noto Sans Arabic', sans-serif;
      font-size: ${fontSize}px;
      line-height: 1.8;
      color: var(--text);
      background: var(--bg);
      direction: rtl;
      text-align: right;
      padding: 0;
    }

    /* Cover Page */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 90vh;
      text-align: center;
      page-break-after: always;
      padding: 40px;
    }

    .cover-page h1 {
      font-size: 2.5em;
      color: var(--primary);
      margin-bottom: 20px;
      border: none;
      padding: 0;
    }

    .cover-page .meta-info {
      color: #6b7280;
      font-size: 1.1em;
      margin-top: 10px;
    }

    .cover-page .divider {
      width: 120px;
      height: 3px;
      background: var(--primary);
      margin: 30px auto;
      border-radius: 2px;
    }

    /* Content Styling */
    h1, h2, h3, h4, h5, h6 {
      color: var(--heading-color);
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 700;
      line-height: 1.3;
    }

    h1 { font-size: 1.8em; border-bottom: 2px solid var(--primary); padding-bottom: 8px; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    h3 { font-size: 1.25em; }

    p {
      margin-bottom: 1em;
      text-align: justify;
    }

    a {
      color: var(--primary);
      text-decoration: none;
      border-bottom: 1px dotted var(--primary);
    }

    a:hover {
      border-bottom-style: solid;
    }

    strong { color: var(--heading-color); }
    em { color: #4b5563; }

    /* Lists */
    ul, ol {
      margin: 0.8em 0;
      padding-right: 2em;
    }

    li {
      margin-bottom: 0.4em;
    }

    /* Code */
    pre {
      background: #1e293b;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      direction: ltr;
      text-align: left;
      margin: 1em 0;
      border: 1px solid #334155;
    }

    pre code {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.9em;
      color: #e2e8f0;
      background: transparent;
    }

    code {
      font-family: 'Fira Code', 'Courier New', monospace;
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88em;
      color: #dc2626;
      border: 1px solid var(--border);
    }

    /* Blockquote */
    blockquote {
      border-right: 4px solid var(--primary);
      margin: 1em 0;
      padding: 12px 20px;
      background: #eff6ff;
      border-radius: 0 8px 8px 0;
      color: #374151;
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 0.95em;
    }

    th {
      background: var(--primary);
      color: white;
      font-weight: 600;
      padding: 12px 15px;
      text-align: right;
    }

    td {
      padding: 10px 15px;
      border-bottom: 1px solid var(--border);
    }

    tr:nth-child(even) {
      background: #f9fafb;
    }

    tr:hover {
      background: #f0f4ff;
    }

    /* Horizontal Rule */
    hr {
      border: none;
      height: 2px;
      background: linear-gradient(to left, transparent, var(--primary), transparent);
      margin: 2em 0;
    }

    /* Images */
    img {
      max-width: 100%;
      border-radius: 8px;
      margin: 1em auto;
      display: block;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    /* Print */
    @media print {
      body { padding: 0; }
      pre { page-break-inside: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
      img { page-break-inside: avoid; }
    }

    ${customCss}
  </style>
</head>
<body>
  ${
    metadata.title
      ? `
  <div class="cover-page">
    <h1>${metadata.title}</h1>
    <div class="divider"></div>
    ${metadata.author ? `<p class="meta-info">المؤلف: ${metadata.author}</p>` : ""}
    ${metadata.subject ? `<p class="meta-info">${metadata.subject}</p>` : ""}
    ${metadata.createdAt ? `<p class="meta-info">التاريخ: ${new Date(metadata.createdAt).toLocaleDateString("ar-SA")}</p>` : ""}
    ${metadata.keywords ? `<p class="meta-info">الكلمات المفتاحية: ${metadata.keywords.join("، ")}</p>` : ""}
  </div>`
      : ""
  }
  <div class="content">
    ${htmlBody}
  </div>
</body>
</html>`;
}

/**
 * Convert HTML to PDF using Puppeteer
 */
export async function htmlToPdf(
  html: string,
  options: ConversionOptions = {}
): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: options.pageSize || "A4",
      landscape: options.orientation === "landscape",
      printBackground: true,
      margin: {
        top: options.margin?.top || "20mm",
        right: options.margin?.right || "15mm",
        bottom: options.margin?.bottom || "20mm",
        left: options.margin?.left || "15mm",
      },
      displayHeaderFooter: !!(options.headerTemplate || options.footerTemplate),
      headerTemplate: options.headerTemplate || "<div></div>",
      footerTemplate:
        options.footerTemplate ||
        `<div style="font-size:10px; text-align:center; width:100%; padding:5px 0;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Full pipeline: Markdown string → PDF Buffer
 */
export async function convertMarkdownToPdf(
  markdown: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    const { metadata, content } = parseMarkdown(markdown);
    const html = markdownToHtml(content, metadata, options);
    const buffer = await htmlToPdf(html, options);

    return {
      success: true,
      buffer,
      metadata,
    };
  } catch (error) {
    return {
      success: false,
      metadata: {},
      error: error instanceof Error ? error.message : "Unknown conversion error",
    };
  }
}

/**
 * Convert markdown file to PDF file
 */
export async function convertFileToPdf(
  inputPath: string,
  outputPath?: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    const markdown = await readFile(inputPath, "utf-8");
    const result = await convertMarkdownToPdf(markdown, options);

    if (!result.success || !result.buffer) {
      return result;
    }

    const finalOutputPath =
      outputPath || join(process.cwd(), "output", `${uuidv4()}.pdf`);

    await mkdir(dirname(finalOutputPath), { recursive: true });
    await writeFile(finalOutputPath, result.buffer);

    return {
      ...result,
      outputPath: finalOutputPath,
    };
  } catch (error) {
    return {
      success: false,
      metadata: {},
      error: error instanceof Error ? error.message : "File conversion error",
    };
  }
}
