// On hover, the text of a strip (title + pill) slides left and comes back, again and again,
// at a constant speed: the same movement as the second row of anacuna.com.
// When the mouse leaves, the text glides back to its starting position.
//
// How far it slides: just enough for the first letter of the title to leave the screen
// (the padding of the strip + the width of that letter). Never more, so the words
// stay readable.

const SPEED = 95; // pixels per second (the reference uses 100)
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

  // 0 -> left -> 0, at a constant speed
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
    strip.slide.currentTime = (-x / SPEED) * 1000; // first half of the cycle: going left
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

function setupAll() {
  strips.forEach((strip) => setup(strip, measure(strip)));
}

setupAll();
strips.forEach((strip) => {
  strip.project.addEventListener("mouseenter", () => start(strip));
  strip.project.addEventListener("mouseleave", () => stop(strip));
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
  strip.project.querySelector(".project__link").addEventListener("click", (event) => openProject(event, strip));
});

// Coming back with the browser's back button: show the list again, not the frozen one
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});
