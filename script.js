// --- Theme: neutral background <-> colored background ---------------------
// The theme is applied right away (this script is loaded in <head>), so there is no
// flash of the wrong color when you move from one page to another.

function setTheme(theme) {
  if (theme === "color") document.documentElement.dataset.theme = "color";
  else delete document.documentElement.dataset.theme;

  const themeSwitch = document.querySelector(".theme-switch");
  if (themeSwitch) themeSwitch.setAttribute("aria-checked", String(theme === "color"));

  try { localStorage.setItem("theme", theme); } catch (e) { /* storage unavailable */ }
}

try {
  if (localStorage.getItem("theme") === "color") document.documentElement.dataset.theme = "color";
} catch (e) { /* ignore */ }

document.addEventListener("DOMContentLoaded", () => {
  const themeSwitch = document.querySelector(".theme-switch");
  themeSwitch.setAttribute("aria-checked", String(document.documentElement.dataset.theme === "color"));

  themeSwitch.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "color" ? "neutral" : "color");
  });
});
