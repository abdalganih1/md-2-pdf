let historyAuthBtn, historyContainer, searchInput, statsContainer;

document.addEventListener("DOMContentLoaded", () => {
  historyAuthBtn = document.getElementById("historyAuthBtn");
  historyContainer = document.getElementById("historyContainer");
  searchInput = document.getElementById("searchInput");
  statsContainer = document.getElementById("statsContainer");

  loadHistory();

  if (searchInput) {
    searchInput.addEventListener("input", debounce(loadHistory, 300));
  }
});

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function loadHistory() {
  if (!historyContainer) return;

  const state = getAuthState();
  const search = searchInput ? searchInput.value.trim() : "";

  let documents = [];

  if (state.isLoggedIn) {
    try {
      const url = search
        ? `/api/history?search=${encodeURIComponent(search)}`
        : "/api/history?limit=50";
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        documents = data.documents;
      }
    } catch (err) {
      documents = [];
    }

    loadStats(state.token);
  } else if (state.isGuest) {
    const localHistory = JSON.parse(
      localStorage.getItem("md2pdf_guest_history") || "[]"
    );
    documents = search
      ? localHistory.filter(
          (d) =>
            (d.title && d.title.includes(search)) ||
            (d.filename && d.filename.includes(search))
        )
      : localHistory;

    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card">
          <span class="stat-number">${localHistory.length}</span>
          <span class="stat-label">مستند محفوظ محلياً</span>
        </div>
      `;
    }
  } else {
    historyContainer.innerHTML = `
      <div class="empty-state">
        <p>قم بتسجيل الدخول أو المتابعة كضيف لحفظ سجلاتك</p>
        <a href="/" class="btn btn-primary">العودة للرئيسية</a>
      </div>
    `;
    return;
  }

  if (documents.length === 0) {
    historyContainer.innerHTML = `
      <div class="empty-state">
        <p>لا توجد سجلات بعد</p>
        <a href="/" class="btn btn-primary">إنشاء مستند جديد</a>
      </div>
    `;
    return;
  }

  historyContainer.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>العنوان</th>
          <th>الحجم</th>
          <th>الثيم</th>
          <th>التاريخ</th>
          <th>إجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${documents.map((doc) => renderHistoryRow(doc)).join("")}
      </tbody>
    </table>
  `;
}

function renderHistoryRow(doc) {
  const title = doc.title || doc.filename || "بدون عنوان";
  const size = formatSize(doc.markdown_size || 0);
  const theme = doc.theme || "blue";
  const date = new Date(
    doc.created_at || doc.timestamp
  ).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <tr>
      <td>${title}</td>
      <td>${size}</td>
      <td><span class="theme-badge theme-${theme}">${theme}</span></td>
      <td>${date}</td>
      <td class="actions-cell">
        ${
          doc.markdown_content
            ? `<button class="btn btn-sm btn-primary" onclick="openDocument(${doc.id})">فتح</button>`
            : ""
        }
        ${
          state().isLoggedIn
            ? `<button class="btn btn-sm btn-danger" onclick="deleteDocument(${doc.id})">حذف</button>`
            : `<button class="btn btn-sm btn-danger" onclick="deleteLocalDocument(${doc.id})">حذف</button>`
        }
      </td>
    </tr>
  `;
}

function state() {
  return getAuthState();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function loadStats(token) {
  if (!statsContainer || !token) return;

  try {
    const res = await fetch("/api/history/stats/summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      statsContainer.innerHTML = `
        <div class="stat-card">
          <span class="stat-number">${s.total || 0}</span>
          <span class="stat-label">إجمالي المستندات</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${s.pdf_count || 0}</span>
          <span class="stat-label">ملفات PDF</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${formatSize(s.total_md_size || 0)}</span>
          <span class="stat-label">حجم Markdown</span>
        </div>
      `;
    }
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

async function openDocument(id) {
  const s = state();
  if (!s.isLoggedIn) return;

  try {
    const res = await fetch(`/api/history/${id}`, {
      headers: { Authorization: `Bearer ${s.token}` },
    });
    const data = await res.json();
    if (data.success && data.document) {
      localStorage.setItem(
        "md2pdf_restore_md",
        data.document.markdown_content
      );
      localStorage.setItem(
        "md2pdf_restore_filename",
        data.document.filename || "مستندي"
      );
      window.location.href = "/";
    }
  } catch (err) {
    alert("فشل تحميل المستند");
  }
}

async function deleteDocument(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المستند؟")) return;

  const s = state();
  try {
    const res = await fetch(`/api/history/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${s.token}` },
    });
    const data = await res.json();
    if (data.success) {
      loadHistory();
    }
  } catch (err) {
    alert("فشل حذف المستند");
  }
}

function deleteLocalDocument(id) {
  if (!confirm("هل أنت متأكد من حذف هذا المستند؟")) return;

  const history = JSON.parse(
    localStorage.getItem("md2pdf_guest_history") || "[]"
  );
  const filtered = history.filter((d) => d.id !== id);
  localStorage.setItem(
    "md2pdf_guest_history",
    JSON.stringify(filtered)
  );
  loadHistory();
}
