let currentTheme = "blue";

function initThemes() {
  const dots = document.querySelectorAll(".theme-dot");

  const savedTheme = localStorage.getItem("md2pdf-theme");
  if (savedTheme) {
    currentTheme = savedTheme;
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateActiveDot(currentTheme);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const theme = dot.getAttribute("data-theme");
      setTheme(theme);
    });
  });
}

function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  updateActiveDot(theme);
  localStorage.setItem("md2pdf-theme", theme);
  updatePreviewTheme(theme);
}

function updateActiveDot(theme) {
  document
    .querySelectorAll(".theme-dot")
    .forEach((d) => d.classList.remove("active"));
  document
    .querySelector(`.theme-dot[data-theme="${theme}"]`)
    ?.classList.add("active");
}

function updatePreviewTheme(theme) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  preview.setAttribute("data-theme", theme);

  const themes = {
    blue:   { primary: "#3498db", light: "#ebf5fb", hover: "#d6eaf8" },
    red:    { primary: "#e74c3c", light: "#fdedec", hover: "#fadbd8" },
    green:  { primary: "#27ae60", light: "#eafaf1", hover: "#d5f5e3" },
    purple: { primary: "#9b59b6", light: "#f5eef8", hover: "#ebdef0" },
    gold:   { primary: "#f39c12", light: "#fef9e7", hover: "#fdebd0" },
  };

  const t = themes[theme] || themes.blue;

  // Remove old override
  const old = document.getElementById("theme-preview-override");
  if (old) old.remove();

  // Inject override styles with !important to beat embedded converter styles
  const style = document.createElement("style");
  style.id = "theme-preview-override";
  style.textContent = `
    :root { --primary: ${t.primary} !important; }
    #preview th { background: ${t.primary} !important; color: #fff !important; }
    #preview tr:nth-child(even) { background: ${t.light} !important; }
    #preview tr:hover { background: ${t.hover} !important; }
    #preview h1 { border-bottom-color: ${t.primary} !important; color: ${t.primary} !important; }
    #preview h2, #preview h3 { color: ${t.primary} !important; }
    #preview blockquote { border-right-color: ${t.primary} !important; background: ${t.light} !important; }
    #preview a { color: ${t.primary} !important; }
    #preview hr { background: linear-gradient(to left, transparent, ${t.primary}, transparent) !important; }
    #preview .cover-page h1 { color: ${t.primary} !important; }
    #preview .cover-page .divider { background: ${t.primary} !important; }
    #preview code:not(pre code) { background: ${t.light} !important; color: ${t.primary} !important; }
  `;
  document.head.appendChild(style);
}

function getThemeCss(theme) {
  const themes = {
    blue:   { primary: "#3498db", light: "#ebf5fb", hover: "#d6eaf8" },
    red:    { primary: "#e74c3c", light: "#fdedec", hover: "#fadbd8" },
    green:  { primary: "#27ae60", light: "#eafaf1", hover: "#d5f5e3" },
    purple: { primary: "#9b59b6", light: "#f5eef8", hover: "#ebdef0" },
    gold:   { primary: "#f39c12", light: "#fef9e7", hover: "#fdebd0" },
  };

  const t = themes[theme] || themes.blue;

  return `
    th { background: ${t.primary} !important; }
    tr:nth-child(even) { background: ${t.light} !important; }
    tr:hover { background: ${t.hover} !important; }
    h1 { border-bottom-color: ${t.primary} !important; color: ${t.primary} !important; }
    .cover-page h1 { color: ${t.primary} !important; }
    .cover-page .divider { background: ${t.primary} !important; }
    blockquote { border-right-color: ${t.primary} !important; background: ${t.light} !important; }
    a { color: ${t.primary} !important; }
    hr { background: linear-gradient(to left, transparent, ${t.primary}, transparent) !important; }
  `;
}

document.addEventListener("DOMContentLoaded", initThemes);
