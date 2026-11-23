// About: when you scroll, every photo moves at its own speed, up or down compared to the page: the same effect as the stickers of
// anacuna.com/about (they use the "paroller" plugin). The position of each photo comes from the CSS; here only a vertical shift is
// added: shift = how far you have scrolled x the factor of the photo (data-factor on a big screen, -md on a tablet, -sm on a phone).
// A positive factor makes the photo go up more slowly than the text, a negative one faster.

(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const photos = [...document.querySelectorAll("[data-factor]")];
  if (!photos.length) return;

  const factorFor = (el) => {
    const width = window.innerWidth;
    if (width < 768) return parseFloat(el.dataset.factorSm ?? el.dataset.factor);
    if (width < 1024) return parseFloat(el.dataset.factorMd ?? el.dataset.factor);
    return parseFloat(el.dataset.factor);
  };

  let ticking = false;

  function update() {
    ticking = false;
    const scrolled = window.scrollY;
    photos.forEach((el) => {
      el.style.transform = `translate3d(0, ${(scrolled * factorFor(el)).toFixed(1)}px, 0)`;
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
