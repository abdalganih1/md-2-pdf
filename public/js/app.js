let currentMarkdown = '';
let currentFilename = 'مستندي';
let isServerRunning = false;

let markdownInput, preview, previewBtn, convertBtn, clearBtn, loadSampleBtn;
let fileInput, selectFileBtn, filenameInput, statusMessage, uploadArea;

function initializeElements() {
  markdownInput = document.getElementById('markdownInput');
  preview = document.getElementById('preview');
  previewBtn = document.getElementById('previewBtn');
  convertBtn = document.getElementById('convertBtn');
  clearBtn = document.getElementById('clearBtn');
  loadSampleBtn = document.getElementById('loadSampleBtn');
  fileInput = document.getElementById('fileInput');
  selectFileBtn = document.getElementById('selectFileBtn');
  filenameInput = document.getElementById('filename');
  statusMessage = document.getElementById('statusMessage');
  uploadArea = document.querySelector('.upload-area');
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.getAttribute('data-tab');
      const tabContent = document.getElementById(tabName + 'Tab');
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
}

const sampleMarkdown = `# مرحباً بك في محول Markdown

هذا **نموذج** لتجربة *المحول* مع دعم RTL كامل للغة العربية.

## المميزات

- ✅ دعم كامل للغة العربية
- ✅ معاينة فورية
- ✅ تصدير PDF بجودة عالية
- ✅ سهل الاستخدام

## أمثلة على التنسيقات

### نص عريض ومائل
يمكنك كتابة نص **عريض** أو *مائل* أو ***كلاهما***.

### القوائم

1. عنصر مرقم
2. عنصر آخر
   - عنصر فرعي
   - عنصر فرعي آخر

### الاقتباسات

> هذا نص مقتبس. يمكنك استخدامه لتأكيد نقطة هامة أو نقل قول ما.

### الروابط

[اضغط هنا لزيارة موقعنا](https://example.com)

### الجداول

| الميزة | الحالة |
|--------|--------|
| RTL | ✅ مدعوم |
| المعاينة | ✅ مدعوم |
| التصدير | ✅ مدعوم |

---

**جرب الآن!** عدّل هذا النص أو اكتب خاصك وشاهد النتيجة.`;

document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  initTabs();
  initEventListeners();
  checkServerStatus();
  restoreFromHistory();

  setTimeout(() => {
    if (!currentMarkdown) {
      loadSample();
    }
  }, 500);

  if (filenameInput) {
    filenameInput.addEventListener('input', () => {
      currentFilename = filenameInput.value || 'مستندي';
    });
  }
});

function restoreFromHistory() {
  const restoreMd = localStorage.getItem('md2pdf_restore_md');
  const restoreFilename = localStorage.getItem('md2pdf_restore_filename');

  if (restoreMd && markdownInput) {
    markdownInput.value = restoreMd;
    currentMarkdown = restoreMd;
    if (filenameInput && restoreFilename) {
      filenameInput.value = restoreFilename;
      currentFilename = restoreFilename;
    }
    localStorage.removeItem('md2pdf_restore_md');
    localStorage.removeItem('md2pdf_restore_filename');
    updatePreview();
  }
}

async function checkServerStatus() {
  try {
    const response = await fetch('/api/health');
    isServerRunning = response.ok;
  } catch (error) {
    isServerRunning = false;
    showStatus('⚠️ الخادم لا يستجيب', 'error');
  }
}

function loadSample() {
  if (!markdownInput) return;
  markdownInput.value = sampleMarkdown;
  currentMarkdown = sampleMarkdown;
  if (filenameInput) filenameInput.value = 'نموذج';
  currentFilename = 'نموذج';
  updatePreview();
}

async function updatePreview() {
  if (!preview || !markdownInput) return;

  const markdown = markdownInput.value.trim();

  if (!markdown) {
    preview.innerHTML = `
      <div class="placeholder">
        <p>👆 اكتب نص Markdown أو ارفع ملف لرؤية المعاينة</p>
      </div>
    `;
    return;
  }

  try {
    showStatus('🔄 جاري تحديث المعاينة...', 'loading');

    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      preview.innerHTML = data.html;
      currentMarkdown = markdown;

      if (typeof currentTheme !== 'undefined') {
        updatePreviewTheme(currentTheme);
      }

      showStatus('✅ تم تحديث المعاينة', 'success');
      setTimeout(() => hideStatus(), 2000);
    } else {
      throw new Error(data.error || 'فشل المعاينة');
    }
  } catch (error) {
    preview.innerHTML = `
      <div class="placeholder">
        <p>❌ حدث خطأ: ${error.message}</p>
        <p style="font-size: 0.9em; margin-top: 10px;">تأكد من أن الخادم يعمل على المنفذ 3000</p>
      </div>
    `;
    showStatus(`❌ ${error.message}`, 'error');
  }
}

async function convertToPdf() {
  if (!markdownInput) return;

  const markdown = markdownInput.value.trim();

  if (!markdown) {
    showStatus('⚠️ الرجاء إدخال نص Markdown أولاً', 'error');
    return;
  }

  const filename = filenameInput ? filenameInput.value.trim() : 'مستندي';
  const finalFilename = filename || 'مستندي';

  try {
    showStatus('⏳ جاري إنشاء PDF... قد يستغرق هذا بضع ثوانٍ', 'loading');
    if (convertBtn) convertBtn.disabled = true;

    const themeCss = typeof getThemeCss === 'function'
      ? getThemeCss(currentTheme || 'blue')
      : '';

    const state = typeof getAuthState === 'function' ? getAuthState() : {};

    const headers = {
      'Content-Type': 'application/json',
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    if (state.guestId) {
      headers['X-Guest-Session'] = state.guestId;
    }

    const response = await fetch('/api/convert', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        markdown,
        options: {
          title: finalFilename,
          rtl: true,
          css: themeCss,
          theme: currentTheme || 'blue',
        }
      }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${finalFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (typeof saveGuestRecord === 'function' && state.isGuest) {
        saveGuestRecord({
          title: finalFilename,
          filename: `${finalFilename}.pdf`,
          markdown_content: markdown,
          markdown_size: markdown.length,
          theme: currentTheme || 'blue',
        });
      }

      showStatus('✅ تم إنشاء PDF بنجاح!', 'success');
      setTimeout(() => hideStatus(), 5000);
    } else {
      const error = await response.json();
      throw new Error(error.error || 'فشل التحويل');
    }
  } catch (error) {
    showStatus(`❌ ${error.message}`, 'error');
  } finally {
    if (convertBtn) convertBtn.disabled = false;
  }
}

function clearInput() {
  if (!confirm('هل أنت متأكد من مسح كل المحتوى؟')) return;
  if (!markdownInput || !preview || !filenameInput) return;

  markdownInput.value = '';
  currentMarkdown = '';
  preview.innerHTML = `
    <div class="placeholder">
      <p>👆 اكتب نص Markdown أو ارفع ملف لرؤية المعاينة</p>
    </div>
  `;
  filenameInput.value = 'مستندي';
  currentFilename = 'مستندي';
  hideStatus();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    readFile(file);
  }
}

function readFile(file) {
  if (!markdownInput || !filenameInput) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target.result;
    markdownInput.value = content;
    currentMarkdown = content;

    const name = file.name.replace(/\.[^/.]+$/, '');
    filenameInput.value = name;
    currentFilename = name;

    updatePreview();

    showStatus(`✅ تم تحميل الملف: ${file.name}`, 'success');
    setTimeout(() => hideStatus(), 3000);
  };

  reader.onerror = () => {
    showStatus('❌ فشل قراءة الملف', 'error');
  };

  reader.readAsText(file);
}

function initDragDrop() {
  if (!uploadArea) return;

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['md', 'markdown', 'txt'].includes(ext)) {
        readFile(file);
      } else {
        showStatus('⚠️ الرجاء اختيار ملف Markdown (.md)', 'error');
      }
    }
  });
}

function showStatus(message, type) {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

function hideStatus() {
  if (!statusMessage) return;
  statusMessage.className = 'status-message';
}

function initEventListeners() {
  if (previewBtn) previewBtn.addEventListener('click', updatePreview);
  if (convertBtn) convertBtn.addEventListener('click', convertToPdf);
  if (clearBtn) clearBtn.addEventListener('click', clearInput);
  if (loadSampleBtn) loadSampleBtn.addEventListener('click', loadSample);

  if (selectFileBtn) {
    selectFileBtn.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      updatePreview();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      convertToPdf();
    }
  });

  initDragDrop();
}
