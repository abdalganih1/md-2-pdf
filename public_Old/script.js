// State
let currentMarkdown = '';
let currentFilename = 'مستندي';
let isServerRunning = false;

// Elements
let markdownInput, preview, previewBtn, convertBtn, clearBtn, loadSampleBtn;
let fileInput, selectFileBtn, filenameInput, statusMessage, uploadArea;

// Initialize elements when DOM is ready
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
  
  console.log('Elements initialized:', {
    markdownInput: !!markdownInput,
    preview: !!preview,
    previewBtn: !!previewBtn,
    convertBtn: !!convertBtn,
    clearBtn: !!clearBtn,
    loadSampleBtn: !!loadSampleBtn,
    fileInput: !!fileInput,
    selectFileBtn: !!selectFileBtn,
    filenameInput: !!filenameInput,
    statusMessage: !!statusMessage,
    uploadArea: !!uploadArea
  });
}

// Tab functionality
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  console.log('Found tabs:', tabs.length);
  
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

// Sample markdown
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  
  // Initialize elements first
  initializeElements();
  
  // Initialize tabs
  initTabs();
  
  // Initialize event listeners (MOVED HERE - this was the bug!)
  initEventListeners();
  
  // Check if server is running
  checkServerStatus();
  
  // Load sample on start
  setTimeout(() => {
    console.log('Loading sample...');
    loadSample();
  }, 500);
  
  // Update filename on change
  if (filenameInput) {
    filenameInput.addEventListener('input', () => {
      currentFilename = filenameInput.value || 'مستندي';
    });
  }
});

// Check if server is running
async function checkServerStatus() {
  try {
    const response = await fetch('/', { method: 'HEAD' });
    isServerRunning = response.ok;
    console.log('Server status:', isServerRunning ? 'Running' : 'Not responding');
  } catch (error) {
    isServerRunning = false;
    console.error('Server not reachable:', error);
    showStatus('⚠️ الخادم لا يستجيب', 'error');
  }
}

// Load sample
function loadSample() {
  console.log('loadSample called, markdownInput:', !!markdownInput);
  if (!markdownInput) return;
  
  markdownInput.value = sampleMarkdown;
  currentMarkdown = sampleMarkdown;
  if (filenameInput) filenameInput.value = 'نموذج';
  currentFilename = 'نموذج';
  
  // Auto-update preview on load
  updatePreview();
}

// Update preview
async function updatePreview() {
  console.log('updatePreview called');
  if (!preview || !markdownInput) {
    console.error('Missing elements:', { preview: !!preview, markdownInput: !!markdownInput });
    return;
  }
  
  const markdown = markdownInput.value.trim();
  console.log('Markdown length:', markdown.length);
  
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
    
    const response = await fetch('/api/preview', {
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
      showStatus('✅ تم تحديث المعاينة', 'success');
      setTimeout(() => hideStatus(), 2000);
    } else {
      throw new Error(data.error || 'فشل المعاينة');
    }
  } catch (error) {
    console.error('Preview error:', error);
    preview.innerHTML = `
      <div class="placeholder">
        <p>❌ حدث خطأ: ${error.message}</p>
        <p style="font-size: 0.9em; margin-top: 10px;">تأكد من أن الخادم يعمل على المنفذ 3000</p>
      </div>
    `;
    showStatus(`❌ ${error.message}`, 'error');
  }
}

// Convert to PDF
async function convertToPdf() {
  console.log('convertToPdf called');
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
    
    const response = await fetch('/api/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        markdown,
        filename: finalFilename 
      }),
    });
    
    if (response.ok) {
      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${finalFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showStatus('✅ تم إنشاء PDF بنجاح!', 'success');
      setTimeout(() => hideStatus(), 5000);
    } else {
      const error = await response.json();
      throw new Error(error.error || 'فشل التحويل');
    }
  } catch (error) {
    console.error('Conversion error:', error);
    showStatus(`❌ ${error.message}`, 'error');
  } finally {
    if (convertBtn) convertBtn.disabled = false;
  }
}

// Clear input
function clearInput() {
  console.log('clearInput called');
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

// File handling
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
    
    // Set filename without extension
    const name = file.name.replace(/\\.[^/.]+$/, '');
    filenameInput.value = name;
    currentFilename = name;
    
    // Auto-update preview after loading file
    updatePreview();
    
    showStatus(`✅ تم تحميل الملف: ${file.name}`, 'success');
    setTimeout(() => hideStatus(), 3000);
  };
  
  reader.onerror = () => {
    showStatus('❌ فشل قراءة الملف', 'error');
  };
  
  reader.readAsText(file);
}

// Drag and drop
function initDragDrop() {
  if (!uploadArea) {
    console.log('No upload area found');
    return;
  }
  
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

// Status messages
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

// Event listeners
function initEventListeners() {
  console.log('Initializing event listeners...');
  
  if (previewBtn) {
    console.log('Adding previewBtn listener');
    previewBtn.addEventListener('click', updatePreview);
  } else {
    console.error('previewBtn not found!');
  }
  
  if (convertBtn) {
    console.log('Adding convertBtn listener');
    convertBtn.addEventListener('click', convertToPdf);
  } else {
    console.error('convertBtn not found!');
  }
  
  if (clearBtn) {
    console.log('Adding clearBtn listener');
    clearBtn.addEventListener('click', clearInput);
  } else {
    console.error('clearBtn not found!');
  }
  
  if (loadSampleBtn) {
    console.log('Adding loadSampleBtn listener');
    loadSampleBtn.addEventListener('click', loadSample);
  } else {
    console.error('loadSampleBtn not found!');
  }
  
  if (selectFileBtn) {
    console.log('Adding selectFileBtn listener');
    selectFileBtn.addEventListener('click', () => { 
      if (fileInput) fileInput.click(); 
    });
  }
  
  if (fileInput) {
    console.log('Adding fileInput listener');
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter = Preview
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      updatePreview();
    }
    
    // Ctrl/Cmd + S = Convert to PDF
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      convertToPdf();
    }
  });
  
  // Initialize drag and drop
  initDragDrop();
  
  console.log('Event listeners initialized');
}
