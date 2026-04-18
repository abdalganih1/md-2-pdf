# MD-2-PDF

أداة لتحويل ملفات Markdown إلى PDF مع دعم اللغة العربية واتجاه RTL.

## المميزات

- تحويل Markdown إلى PDF بجودة عالية
- دعم كامل للغة العربية واتجاه RTL
- واجهة ويب تفاعلية مع محرر CodeMirror
- معاينة مباشرة للـ Markdown
- خيارات تنسيق متعددة (حجم الصفحة، الهوامش، اتجاه الصفحة)
- حفظ تلقائي للمسودات في localStorage
- MCP Server للتكامل مع Claude CLI
- REST API للتكامل مع التطبيقات الأخرى

## التثبيت

```bash
npm install
```

## البناء والتشغيل

### البناء

```bash
npm run build
```

### التشغيل (API Server)

```bash
npm start
```

سيتم تشغيل الخادم على `http://localhost:3000`

### التطوير

```bash
npm run dev
```

### تشغيل MCP Server

```bash
npm run mcp
```

## نقاط النهاية API

### GET `/`
واجهة الويب التفاعلية.

### GET `/api/health`
فحص صحة الخادم.

### POST `/api/convert`
تحويل Markdown إلى PDF.

```json
{
  "markdown": "# مرحبا بالعالم\n\nهذا اختبار.",
  "options": {
    "title": "عنوان المستند",
    "author": "المؤلف",
    "pageSize": "A4",
    "orientation": "portrait",
    "margins": {
      "top": 20,
      "bottom": 20,
      "left": 15,
      "right": 15
    },
    "rtl": true,
    "generateToc": false,
    "coverPage": false
  }
}
```

**الاستجابة:** PDF binary

### POST `/api/convert/base64`
تحويل Markdown إلى PDF (base64).

**الاستجابة:**
```json
{
  "success": true,
  "message": "Conversion successful",
  "metadata": {
    "title": "عنوان المستند",
    "author": "المؤلف"
  },
  "pdfBase64": "JVBERi0xLjQKJ..."
}
```

### POST `/api/convert/file`
تحويل Markdown وحفظ PDF على الخادم.

### POST `/api/parse`
تحليل Markdown واستخراج البيانات الوصفية مع معاينة HTML.

```json
{
  "markdown": "---\ntitle: عنوان\nauthor: المؤلف\n---\n# المحتوى"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "metadata": {
    "title": "عنوان",
    "author": "المؤلف"
  },
  "html": "<h1>المحتوى</h1>"
}
```

## MCP Server (Model Context Protocol)

الخادم MCP يوفر الأدوات التالية للتكامل مع تطبيقات LLM:

### الأدوات المتاحة

1. **convert-markdown-to-pdf**: تحويل نص Markdown إلى PDF
2. **convert-markdown-file-to-pdf**: تحويل ملف Markdown إلى PDF
3. **parse-markdown-metadata**: استخراج البيانات الوصفية من Markdown

### التكامل مع Claude Desktop

أضف التالي إلى ملف إعدادات Claude Desktop:

```json
{
  "mcpServers": {
    "md-2-pdf": {
      "command": "node",
      "args": ["/path/to/md-2-pdf/dist/mcp/server.js"]
    }
  }
}
```

## خيارات التحويل

| الخيار | النوع | القيمة الافتراضية | الوصف |
|--------|------|------------------|--------|
| `title` | string | من الـ front matter | عنوان المستند |
| `author` | string | من الـ front matter | المؤلف |
| `pageSize` | string | `"A4"` | حجم الصفحة (A4, Letter, Legal) |
| `orientation` | string | `"portrait"` | الاتجاه (portrait, landscape) |
| `margins` | object | `{top: 20, bottom: 20, left: 15, right: 15}` | الهوامش بالمليمتر |
| `rtl` | boolean | `true` | دعم RTL |
| `generateToc` | boolean | `false` | إنشاء فهرس تلقائي |
| `coverPage` | boolean | `false` | إضافة صفحة غلاف |

## Front Matter

يمكن تحديد البيانات الوصفية في أعلى ملف Markdown:

```markdown
---
title: عنوان المستند
author: اسم المؤلف
date: 2024-01-01
---

# المحتوى يبدأ هنا
```

## البنية

```
md-2-pdf/
├── src/
│   ├── index.ts          # Entry point
│   ├── engine/
│   │   ├── converter.ts  # منطق التحويل الأساسي
│   │   └── index.ts     # الصادرات
│   ├── api/
│   │   └── server.ts    # خادم Express REST API
│   └── mcp/
│       └── server.ts    # خادم MCP
├── public/
│   ├── index.html       # واجهة الويب
│   ├── css/
│   │   └── style.css    # الأنماط
│   └── js/
│       └── app.js       # JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## المتطلبات

- Node.js 18+
- npm أو yarn
- Puppeteer (للتحويل إلى PDF)

## الترخيص

MIT