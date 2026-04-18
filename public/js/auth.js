const AUTH_KEY = "md2pdf_auth_token";
const USER_KEY = "md2pdf_user";
const GUEST_KEY = "md2pdf_guest_session";
const GUEST_HISTORY_KEY = "md2pdf_guest_history";

function getAuthState() {
  const token = localStorage.getItem(AUTH_KEY);
  const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  const guestId = localStorage.getItem(GUEST_KEY);

  return {
    isLoggedIn: !!token,
    isGuest: !token && !!guestId,
    token,
    user,
    guestId,
  };
}

async function login(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem(AUTH_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    updateAuthUI();
  }
  return data;
}

async function register(username, email, password) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem(AUTH_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    updateAuthUI();
  }
  return data;
}

async function continueAsGuest() {
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    const res = await fetch("/api/auth/guest", { method: "POST" });
    const data = await res.json();
    guestId = data.guestSessionId;
    localStorage.setItem(GUEST_KEY, guestId);
  }
  updateAuthUI();
  closeAuthModal();
}

function saveGuestRecord(record) {
  const history = JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) || "[]");
  history.unshift({
    ...record,
    id: Date.now(),
    timestamp: new Date().toISOString(),
  });
  if (history.length > 100) history.pop();
  localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(history));
}

function updateAuthUI() {
  const state = getAuthState();
  const authBtn = document.getElementById("authBtn");

  if (!authBtn) return;

  if (state.isLoggedIn) {
    const name = state.user?.displayName || state.user?.username || "مستخدم";
    authBtn.innerHTML = `👤 ${name}`;
    authBtn.classList.add("logged-in");
    authBtn.onclick = null;
  } else if (state.isGuest) {
    authBtn.innerHTML = "👤 ضيف";
    authBtn.classList.add("guest");
    authBtn.onclick = toggleAuthModal;
  } else {
    authBtn.innerHTML = "🔑 تسجيل الدخول";
    authBtn.classList.remove("logged-in", "guest");
    authBtn.onclick = toggleAuthModal;
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  updateAuthUI();
  window.location.reload();
}

function clearGuestData() {
  if (
    confirm(
      "هل أنت متأكد من حذف جميع سجلاتك المحلية؟ لا يمكن التراجع."
    )
  ) {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(GUEST_HISTORY_KEY);
    updateAuthUI();
  }
}

function toggleAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.hidden = !modal.hidden;
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.hidden = true;
  }
}

function initAuthTabs() {
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".auth-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".auth-form")
        .forEach((f) => (f.hidden = true));
      tab.classList.add("active");
      const tabName = tab.getAttribute("data-tab");
      const form = document.getElementById(tabName + "Form");
      if (form) form.hidden = false;
    });
  });
}

function initAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = loginForm.querySelectorAll("input");
      const email = inputs[0].value;
      const password = inputs[1].value;
      const data = await login(email, password);
      if (data.success) {
        closeAuthModal();
      } else {
        alert(data.error || "خطأ في تسجيل الدخول");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll("input");
      const username = inputs[0].value;
      const email = inputs[1].value;
      const password = inputs[2].value;
      const data = await register(username, email, password);
      if (data.success) {
        closeAuthModal();
      } else {
        alert(data.error || "خطأ في التسجيل");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  initAuthTabs();
  initAuthForms();
});
