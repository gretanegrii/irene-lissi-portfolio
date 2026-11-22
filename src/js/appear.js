// The things of a page appear one after the other: they fade in and rise a little, when the page opens and when they
// come into view while you scroll (also when you scroll very fast: nothing stays hidden). The ones that come in together appear with a small delay one after the other.
// (The strip with the title of a case study is not here: it has to be there at once, as the strip of the work list
// has just arrived there.)

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  const SELECTOR = [
    ".home__letter", // the letters of the name
    ".home__tagline",
    ".about__statement",
    ".about__text p",
    ".about__skill",
    ".about__block",
    ".contact__statement",
    ".contact__pill",
    ".case__lead",
    ".case__head",
    ".case__body",
    ".case__figure > .case__photo", // not the ones in a slider (they are shown by the swipe)
    ".case__slider",
    ".case__tiles",
    ".case__caption",
    ".case__big",
  ].join(",");

  const STEP = 80; // ms between one thing and the next one that comes in with it
  const MAX_DELAY = 800; // ms

  const targets = [...document.querySelectorAll(SELECTOR)];
  targets.forEach((el) => el.classList.add("appear"));
  let pending = targets.slice(); // in the order of the page

  // A thing appears when its top is above the bottom of the window: also when it has been scrolled past very fast
  // (it must never stay invisible). Checked at the start and at every scroll.
  function reveal() {
    ticking = false;
    const limit = window.innerHeight * 0.96;
    let n = 0;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top >= limit) return true; // not yet
      el.style.animationDelay = `${Math.min(n * STEP, MAX_DELAY)}ms`;
      el.classList.add("is-in");
      // the delay is only for the appearance: it must not stay
      el.addEventListener("animationend", () => (el.style.animationDelay = ""), { once: true });
      n += 1;
      return false;
    });
    if (!pending.length) {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(reveal);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  requestAnimationFrame(reveal);
})();
