// On hover, the text of a strip (title + pill) slides left and comes back, again and again,
// at a constant speed: the same movement as the second row of anacuna.com.
// When the mouse leaves, the text glides back to its starting position.
//
// How far it slides: just enough for the first letter of the title to leave the screen
// (the padding of the strip + the width of that letter). Never more, so the words
// stay readable.

const SPEED = 95; // pixels per second (the reference uses 100)
// Touch screens: the text goes all the way to the end of the word (so it can be read), slowly, stays there for a
// moment, comes back, stays again, and so on. No quick zigzag.
const TOUCH_SPEED = 55; // pixels per second
const TOUCH_HOLD = 900; // ms the text waits at each end
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
    // 0 (wait) -> end of the word -> (wait) -> 0, one slow trip each way
    const move = (distance / TOUCH_SPEED) * 1000;
    const total = move * 2 + TOUCH_HOLD * 2;
    const at = (ms) => ms / total;
    strip.speed = TOUCH_SPEED;
    strip.hold = TOUCH_HOLD;
    strip.slide = text.animate(
      [
        { transform: "translateX(0)", offset: 0 },
        { transform: "translateX(0)", offset: at(TOUCH_HOLD) },
        { transform: `translateX(${-distance}px)`, offset: at(TOUCH_HOLD + move) },
        { transform: `translateX(${-distance}px)`, offset: at(TOUCH_HOLD * 2 + move) },
        { transform: "translateX(0)", offset: 1 },
      ],
      { duration: total, iterations: Infinity, easing: "linear" }
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

// --- Entrance -------------------------------------------------------------------------
// When the page opens, the strips take their colors one after the other, from the first to the last, as if they
// built a rainbow. They stay colored for a moment, then the colors go away, again from the first to the last,
// and the page is the white list with the hover, as usual.

const ENTER_DELAY = 250; // ms before it starts
const ENTER_STEP = 110; // ms between one strip and the next
const ENTER_IN = 380; // ms a strip takes to get its color
const ENTER_HOLD = 900; // ms the whole rainbow stays
const EXIT_STEP = 45; // ms between one strip and the next when the colors go away
const EXIT_OUT = 600; // ms a strip takes to go back to white

let entrance = [];

function playEntrance() {
  if (reducedMotion.matches) return;
  const n = strips.length;
  const rainbowDone = ENTER_DELAY + (n - 1) * ENTER_STEP + ENTER_IN; // the last strip has its color
  const total = rainbowDone + ENTER_HOLD + (n - 1) * EXIT_STEP + EXIT_OUT;
  const at = (ms) => Math.min(1, ms / total);

  entrance = strips.map((strip, i) => {
    const color = getComputedStyle(strip.project).getPropertyValue("--color").trim();
    const start = ENTER_DELAY + i * ENTER_STEP;
    const leave = rainbowDone + ENTER_HOLD + i * EXIT_STEP;
    return strip.project.animate(
      [
        { backgroundColor: "#fff", offset: 0 },
        { backgroundColor: "#fff", offset: at(start) },
        { backgroundColor: color, offset: at(start + ENTER_IN) },
        { backgroundColor: color, offset: at(leave) },
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
