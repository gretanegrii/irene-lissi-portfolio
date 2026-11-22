// On hover, the text of a strip (title + pill) slides left and comes back, again and again,
// at a constant speed: the same movement as the second row of anacuna.com.
// When the mouse leaves, the text glides back to its starting position.
//
// How far it slides: just enough for the first letter of the title to leave the screen
// (the padding of the strip + the width of that letter). Never more, so the words
// stay readable.

const SPEED = 95; // pixels per second (the reference uses 100)
// Touch screens: the text goes all the way to the end of the word (so it can be read), slowly, and comes back,
// without stopping at the ends. No quick zigzag.
const TOUCH_SPEED = 55; // pixels per second
const RETURN_TIME = 400; // ms the text takes to go back when the mouse leaves

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let opening = false; // true once a case study is opening: the hover movement stops
const strips = [...document.querySelectorAll(".project")].map((project) => ({
  project,
  text: project.querySelector(".project__text"),
  title: project.querySelector(".project__title"),
  slide: null, // the left-and-back animation
  goBack: null, // the short animation that brings the text back on mouse leave
}));

// Current horizontal position of the text, read from its transform
function currentX(text) {
  return new DOMMatrixReadOnly(getComputedStyle(text).transform).m41;
}

// How far the text has to slide so that only the first letter of the title disappears
function measure(strip) {
  if (isTouch()) {
    // Until the end of the last thing of the strip (the title, or the pill after it) is inside the screen,
    // with the same air at the right as at the left. A short title does not move.
    const { text } = strip;
    const padding = parseFloat(getComputedStyle(text).paddingLeft);
    const last = text.lastElementChild || strip.title;
    const end = last.getBoundingClientRect().right - text.getBoundingClientRect().left + padding;
    return Math.max(0, end - text.clientWidth);
  }

  const paddingLeft = parseFloat(getComputedStyle(strip.text).paddingLeft);

  // Width of the first letter, as it is drawn (uppercase, with the real font)
  const textNode = strip.title.firstChild;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, 1);

  return paddingLeft + range.getBoundingClientRect().width;
}

// (Re)build the left-and-back animation of a strip, sliding `distance` pixels
function setup(strip, distance) {
  const { text } = strip;
  if (strip.slide) strip.slide.cancel();
  if (strip.goBack) strip.goBack.cancel();
  strip.slide = null;
  strip.goBack = null;

  if (distance < 1) return; // nothing to move

  if (isTouch()) {
    // 0 -> end of the word -> 0, slowly, without stopping at the ends
    const move = (distance / TOUCH_SPEED) * 1000;
    strip.speed = TOUCH_SPEED;
    strip.hold = 0;
    strip.slide = text.animate(
      [
        { transform: "translateX(0)", offset: 0 },
        { transform: `translateX(${-distance}px)`, offset: 0.5 },
        { transform: "translateX(0)", offset: 1 },
      ],
      { duration: move * 2, iterations: Infinity, easing: "linear" }
    );
    strip.slide.pause();
    return;
  }

  // 0 -> left -> 0, at a constant speed
  strip.speed = SPEED;
  strip.hold = 0;
  strip.slide = text.animate(
    [
      { transform: "translateX(0)", offset: 0 },
      { transform: `translateX(${-distance}px)`, offset: 0.5 },
      { transform: "translateX(0)", offset: 1 },
    ],
    {
      duration: ((distance * 2) / SPEED) * 1000,
      iterations: Infinity,
      easing: "linear",
    }
  );
  strip.slide.pause();
}

function start(strip) {
  if (opening || reducedMotion.matches || !strip.slide) return;

  // If the mouse comes back while the text is still going back, continue from where it is
  if (strip.goBack) {
    const x = currentX(strip.text);
    strip.goBack.cancel();
    strip.goBack = null;
    strip.slide.currentTime = strip.hold + (-x / strip.speed) * 1000; // first trip of the cycle: going left
  }

  strip.slide.play();
}

function stop(strip) {
  if (opening || reducedMotion.matches || !strip.slide) return;

  const x = currentX(strip.text);

  // Reset the slide to its start, then glide from where the text is to 0
  strip.slide.pause();
  strip.slide.currentTime = 0;

  strip.goBack = strip.text.animate(
    [{ transform: `translateX(${x}px)` }, { transform: "translateX(0)" }],
    { duration: RETURN_TIME, easing: "ease" }
  );
  strip.goBack.onfinish = () => {
    strip.goBack = null;
  };
}

// --- Touch screens ------------------------------------------------------------------
// There is no hover with a finger. The first tap on a strip "turns it on": it takes its color (CSS), a white square
// with an arrow slides in from the left, and the text slides like on hover. A second tap on the same strip opens
// the case study. A tap somewhere else turns the strip off.
const isTouch = () => window.matchMedia("(hover: none)").matches;
let activeStrip = null;

function activate(strip) {
  if (activeStrip === strip) return;
  deactivate();
  activeStrip = strip;
  strip.project.classList.add("is-touch-active");
  start(strip);
}

function deactivate() {
  if (!activeStrip) return;
  const strip = activeStrip;
  activeStrip = null;
  strip.project.classList.remove("is-touch-active");
  stop(strip);
}

// The white square with the round arrow (decorative: the link is the whole strip)
strips.forEach((strip) => {
  const go = document.createElement("span");
  go.className = "project__go";
  go.setAttribute("aria-hidden", "true");
  go.innerHTML =
    '<span class="project__go-pill"><svg viewBox="0 0 16 16"><path d="M3 13 13 3M5 3h8v8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></span>';
  strip.project.querySelector(".project__link").append(go);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".project")) deactivate();
});

function setupAll() {
  strips.forEach((strip) => {
    // measured at rest: not while the text is sliding
    if (strip.slide) strip.slide.cancel();
    if (strip.goBack) strip.goBack.cancel();
    strip.slide = null;
    strip.goBack = null;
    setup(strip, measure(strip));
  });
  if (activeStrip) start(activeStrip); // a strip that is turned on (touch) goes on sliding
}

setupAll();
strips.forEach((strip) => {
  // With a finger the browser also sends mouse events after a tap: they are ignored, the tap has its own logic
  strip.project.addEventListener("mouseenter", () => !isTouch() && start(strip));
  strip.project.addEventListener("mouseleave", () => !isTouch() && stop(strip));
});

window.addEventListener("resize", setupAll);
document.fonts.ready.then(setupAll); // measure again when the font has loaded

// --- Opening a case study ---------------------------------------------------
// Same gesture as anacuna.com: the strips above the chosen one slide up and out,
// the ones below slide down and out, and the chosen strip rises under the navbar,
// where the case study page starts with the same strip. Then the page opens.

const OPEN_TIME = 1200; // ms
const OPEN_EASING = "cubic-bezier(0.76, 0, 0.24, 1)"; // ease in-out, strong (the reference: power3.inOut)

function openProject(event, strip) {
  if (reducedMotion.matches || opening) return; // reduced motion: plain link, no animation
  event.preventDefault();
  opening = true;

  const href = event.currentTarget.href;
  const color = getComputedStyle(strip.project).getPropertyValue("--color").trim();
  const index = strips.indexOf(strip);

  // Where the strip has to end: the top of the case study page (the padding of .work + the air under the navbar)
  // plus the air under the navbar (--case-gap, defined in case.css, measured with a probe)
  const work = document.querySelector(".work");
  const probe = document.createElement("div");
  probe.style.cssText = "position: absolute; visibility: hidden; height: min(4vw, 67px);";
  work.appendChild(probe);
  const target = parseFloat(getComputedStyle(work).paddingTop) + probe.offsetHeight;
  probe.remove();

  // 1. Measure everything before touching anything
  const tops = strips.map((s) => s.project.getBoundingClientRect().top);
  const textX = currentX(strip.text);

  // 2. Stop the hover movement and freeze every strip where it is on the screen
  stopEntrance();
  strips.forEach((s) => {
    if (s.slide) s.slide.cancel();
    if (s.goBack) s.goBack.cancel();
  });
  document.body.classList.add("is-opening");
  strip.project.classList.add("project--active");
  strips.forEach((s, i) => {
    s.project.style.cssText = `position: fixed; top: ${tops[i]}px; left: 0; width: 100%; margin: 0;`;
  });
  window.scrollTo(0, 0);

  // 3. Slide
  const options = { duration: OPEN_TIME, easing: OPEN_EASING, fill: "forwards" };
  const slideBy = (el, y) => el.animate([{ transform: "translateY(0)" }, { transform: `translateY(${y})` }], options);

  const animations = strips.map((s, i) => {
    if (i < index) return slideBy(s.project, "-100vh");
    if (i > index) return slideBy(s.project, "100vh");
    return slideBy(s.project, `${target - tops[i]}px`);
  });
  // The text of the chosen strip comes back to its place while the strip rises
  animations.push(
    strip.text.animate([{ transform: `translateX(${textX}px)` }, { transform: "translateX(0)" }], options)
  );

  // 4. When everything has moved, the page takes the color of the project and opens
  Promise.all(animations.map((a) => a.finished)).then(() => {
    document.body.style.background = color;
    window.location.href = href;
  });
}

strips.forEach((strip) => {
  strip.project.querySelector(".project__link").addEventListener("click", (event) => {
    // Touch: the first tap only turns the strip on, the second one opens it
    if (isTouch() && activeStrip !== strip) {
      event.preventDefault();
      activate(strip);
      return;
    }
    openProject(event, strip);
  });
});

// --- Grid view -------------------------------------------------------------------------
// The grid is made from the strips of the list (same works, same colors, same pictures): each cell has the picture,
// the title and the pill with the area of interest. The choice between row and grid is in data-view of <html>
// (the page sets it before it is drawn, from what the browser remembers).

const cells = strips.map((strip) => {
  const link = strip.project.querySelector(".project__link");
  const thumb = strip.project.querySelector(".project__thumb");
  const tag = strip.project.querySelector(".project__tag");

  const li = document.createElement("li");
  li.className = "work__cell";
  li.style.setProperty("--color", getComputedStyle(strip.project).getPropertyValue("--color").trim());

  const a = document.createElement("a");
  a.className = "work__cell-link";
  a.href = link.href;

  if (thumb) {
    const img = document.createElement("img");
    img.className = "work__cell-pic";
    img.src = thumb.getAttribute("src");
    img.alt = "";
    img.width = 700;
    img.height = 467;
    img.loading = "lazy";
    a.append(img);
  }

  const title = document.createElement("span");
  title.className = "work__cell-title";
  title.textContent = strip.title.textContent;
  a.append(title);
  if (tag) a.append(document.createElement("br"), tag.cloneNode(true));

  li.append(a);
  return { li, a, strip };
});

const grid = document.createElement("ul");
grid.className = "work__grid";
grid.append(...cells.map((cell) => cell.li));
strips[0].project.parentElement.after(grid);

// Opening a work from the grid: the cell takes its color, the others fade away, then the page opens
grid.addEventListener("click", (event) => {
  const link = event.target.closest(".work__cell-link");
  if (!link || reducedMotion.matches || opening) return;
  event.preventDefault();
  opening = true;
  stopEntrance();
  const cell = cells.find((c) => c.a === link);
  document.body.classList.add("is-opening");
  cell.li.classList.add("work__cell--chosen");
  const color = getComputedStyle(cell.li).getPropertyValue("--color").trim();
  setTimeout(() => {
    document.body.style.background = color;
    window.location.href = link.href;
  }, 450);
});

// The two pills to choose the view
const viewButtons = [...document.querySelectorAll(".work__view-btn")];

function syncViewButtons() {
  const view = document.documentElement.dataset.view;
  viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
}

function setView(view) {
  if (document.documentElement.dataset.view === view) return;
  document.documentElement.dataset.view = view;
  try {
    localStorage.setItem("work-view", view);
  } catch (error) {
    // the browser does not remember: it works anyway
  }
  syncViewButtons();
  deactivate(); // a strip turned on with the finger
  stopEntrance();
  playEntrance(); // the colors run through the new view, as when the page opens
}

viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
syncViewButtons();

// --- Entrance -------------------------------------------------------------------------
// When the page opens, the strips take their colors one after the other, from the first to the last, and stay
// colored: together they make a complete rainbow. It stays for a moment, then the colors go away, from the first
// to the last, and the page is the white list with the hover, as usual.

const ENTER_DELAY = 150; // ms before it starts
const ENTER_STEP = 60; // ms between one strip and the next
const ENTER_IN = 220; // ms a strip takes to get its color
const ENTER_HOLD = 700; // ms the whole rainbow stays
const EXIT_STEP = 30; // ms between one strip and the next when the colors go away
const EXIT_OUT = 400; // ms a strip takes to go back to white

let entrance = [];

// What lights up: the strips of the row view, or the cells of the grid view (in the order of the page)
function entranceItems() {
  return document.documentElement.dataset.view === "grid"
    ? cells.map((cell) => cell.li)
    : strips.map((strip) => strip.project);
}

function playEntrance() {
  if (reducedMotion.matches) return;
  const items = entranceItems();
  const n = items.length;
  const rainbowDone = ENTER_DELAY + (n - 1) * ENTER_STEP + ENTER_IN; // the last strip has its color
  const total = rainbowDone + ENTER_HOLD + (n - 1) * EXIT_STEP + EXIT_OUT;
  const at = (ms) => Math.min(1, ms / total);

  entrance = items.map((item, i) => {
    const color = getComputedStyle(item).getPropertyValue("--color").trim();
    const start = ENTER_DELAY + i * ENTER_STEP; // here the strip starts to take its color
    const leave = rainbowDone + ENTER_HOLD + i * EXIT_STEP; // here it starts to go back to white
    return item.animate(
      [
        { backgroundColor: "#fff", offset: 0 },
        { backgroundColor: "#fff", offset: at(start), easing: "ease-out" },
        { backgroundColor: color, offset: at(start + ENTER_IN) },
        { backgroundColor: color, offset: at(leave), easing: "ease-in-out" },
        { backgroundColor: "#fff", offset: at(leave + EXIT_OUT) },
        { backgroundColor: "#fff", offset: 1 },
      ],
      { duration: total, easing: "linear" }
    );
  });
}

function stopEntrance() {
  entrance.forEach((animation) => animation.cancel());
  entrance = [];
}

playEntrance();

// Coming back with the browser's back button: show the list again, not the frozen one
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});
