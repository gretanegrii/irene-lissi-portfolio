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
  if (reducedMotion.matches || !strip.slide) return;

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
  if (reducedMotion.matches || !strip.slide) return;

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
