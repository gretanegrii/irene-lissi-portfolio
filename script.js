const site = document.querySelector(".site");
const pages = document.querySelectorAll(".page");
const links = document.querySelectorAll(".nav a");

let currentPage = "home";
let progress = 0; // 0 = site fully visible, 1 = contacts fully revealed

// --- Pages -------------------------------------------------------------

function showPage(id) {
  currentPage = document.getElementById(id) ? id : "home";
  pages.forEach((page) => page.classList.toggle("active", page.id === currentPage));
  links.forEach((link) => link.classList.toggle("active", link.dataset.page === currentPage));
}

links.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const id = link.dataset.page;
    history.replaceState(null, "", `#${id}`);
    if (id === "contact") {
      moveTo(1, true);
    } else {
      showPage(id);
    }
  });
});

// --- Contacts reveal: the site follows the scroll / finger 1:1 -------------

function setProgress(value) {
  progress = Math.min(1, Math.max(0, value));
  site.style.transform = `translateY(${-progress * 100}%)`;
}

// animate = true only for clicks, keys and the snap after a swipe
function moveTo(value, animate) {
  site.classList.toggle("animating", animate);
  setProgress(value);
}

// Mouse wheel / trackpad: every bit of scroll moves the site by the same amount
window.addEventListener(
  "wheel",
  (event) => {
    moveTo(progress + event.deltaY / window.innerHeight, false);
  },
  { passive: true }
);

// Touch: the site follows the finger, on release it snaps to the nearest side
let touchStartY = 0;
let touchStartProgress = 0;

window.addEventListener("touchstart", (event) => {
  touchStartY = event.touches[0].clientY;
  touchStartProgress = progress;
}, { passive: true });

window.addEventListener("touchmove", (event) => {
  const delta = touchStartY - event.touches[0].clientY;
  moveTo(touchStartProgress + delta / window.innerHeight, false);
}, { passive: true });

window.addEventListener("touchend", () => {
  moveTo(progress > 0.5 ? 1 : 0, true);
});

// Keyboard
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") moveTo(1, true);
  if (event.key === "ArrowUp" || event.key === "Escape") moveTo(0, true);
});

// --- Theme switch: neutral background <-> colored background ------------------

const themeSwitch = document.querySelector(".theme-switch");

function setTheme(theme) {
  if (theme === "color") document.documentElement.dataset.theme = "color";
  else delete document.documentElement.dataset.theme;
  themeSwitch.setAttribute("aria-checked", String(theme === "color"));
  try { localStorage.setItem("theme", theme); } catch (e) { /* storage unavailable */ }
}

themeSwitch.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "color" ? "neutral" : "color");
});

try { setTheme(localStorage.getItem("theme") === "color" ? "color" : "neutral"); } catch (e) { /* ignore */ }

// --- Start -------------------------------------------------------------

showPage("home");
const startId = location.hash.slice(1);
if (startId === "contact") moveTo(1, false);
else if (startId) showPage(startId);
