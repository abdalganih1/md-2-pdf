const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        document
          .querySelectorAll(".docs-sidebar a")
          .forEach((a) => a.classList.remove("active"));
        const activeLink = document.querySelector(
          `.docs-sidebar a[href="#${entry.target.id}"]`
        );
        if (activeLink) activeLink.classList.add("active");
      }
    });
  },
  { threshold: 0.2 }
);

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".docs-main section[id]").forEach((section) => {
    observer.observe(section);
  });
});

function copyCode(btn) {
  const code = btn.closest(".code-block").querySelector("code").textContent;
  navigator.clipboard.writeText(code);
  btn.textContent = "\u2713 \u062A\u0645 \u0627\u0644\u0646\u0633\u062E!";
  setTimeout(() => (btn.textContent = "\u0646\u0633\u062E"), 2000);
}

async function tryEndpoint(btn, method, url, body) {
  const resultDiv = btn.nextElementSibling;
  if (!resultDiv || !resultDiv.classList.contains("try-result")) return;

  btn.textContent = "\u23F3 \u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062C\u0631\u0628\u0629...";
  btn.disabled = true;

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type");
    let result;

    if (contentType && contentType.includes("application/json")) {
      result = JSON.stringify(await response.json(), null, 2);
    } else {
      result = `Status: ${response.status} ${response.statusText}\nContent-Type: ${contentType}`;
    }

    resultDiv.querySelector("pre").textContent = result;
    resultDiv.classList.add("show");
    btn.textContent = "\uD83E\uDDEA \u062C\u0631\u0651\u0628 \u0627\u0644\u0622\u0646";
  } catch (err) {
    resultDiv.querySelector("pre").textContent = `Error: ${err.message}`;
    resultDiv.classList.add("show");
    btn.textContent = "\uD83E\uDDEA \u062C\u0631\u0651\u0628 \u0627\u0644\u0622\u0646";
  } finally {
    btn.disabled = false;
  }
}
