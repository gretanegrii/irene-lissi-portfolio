// The title strip at the top of a case study: when the title (with its pill) is longer than the screen, it slides
// slowly to the end of the word so that it can be read, stays there a moment, comes back, stays again, and so on:
// the same slow trip as the strips of the work list on a phone. A title that fits does not move.

(() => {
  const SPEED = 55; // pixels per second
  const HOLD = 900; // ms the text waits at each end

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const text = document.querySelector(".case .project__text");
  const title = text && text.querySelector(".project__title");
  let slide = null;

  // How far the text has to slide so that its farthest end (the title, or the pill) is inside the screen,
  // with the same air at the right as at the left
  function measure() {
    const padding = parseFloat(getComputedStyle(text).paddingLeft);
    // the farthest right edge of the title and of the pill (the pill can be next to the title or under it)
    const right = Math.max(...[...text.children].map((child) => child.getBoundingClientRect().right));
    const end = right - text.getBoundingClientRect().left + padding;
    return Math.max(0, end - text.clientWidth);
  }

  function setup() {
    if (slide) slide.cancel(); // measured at rest
    slide = null;
    if (reducedMotion.matches) return;

    const distance = measure();
    if (distance < 1) return;

    const move = (distance / SPEED) * 1000;
    const total = move * 2 + HOLD * 2;
    const at = (ms) => ms / total;
    slide = text.animate(
      [
        { transform: "translateX(0)", offset: 0 },
        { transform: "translateX(0)", offset: at(HOLD) },
        { transform: `translateX(${-distance}px)`, offset: at(HOLD + move) },
        { transform: `translateX(${-distance}px)`, offset: at(HOLD * 2 + move) },
        { transform: "translateX(0)", offset: 1 },
      ],
      { duration: total, iterations: Infinity, easing: "linear" }
    );
  }

  if (text && title) {
    setup();
    window.addEventListener("resize", setup);
    document.fonts.ready.then(setup); // measure again when the font has loaded
    reducedMotion.addEventListener("change", setup);
  }
})();
