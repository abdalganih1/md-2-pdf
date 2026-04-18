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
  if (preview) {
    preview.setAttribute("data-theme", theme);
  }
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
