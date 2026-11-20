// Slider of the case study pages (see .case__slider in case.css).
// The pictures are side by side in a box that scrolls and "snaps" on each one, so the swipe on a phone and the
// trackpad work by themselves. This script adds: the dots, the click on the left or right half of the picture,
// the arrow keys, and the white pill with two arrows that follows the mouse.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll("[data-slider]").forEach((slider) => {
  const track = slider.querySelector(".case__slides");
  const slides = [...track.children];
  const dots = [...slider.querySelectorAll(".case__dot")];
  const cursor = slider.querySelector(".case__cursor");

  const current = () => Math.round(track.scrollLeft / track.clientWidth);

  function goTo(index) {
    const next = (index + slides.length) % slides.length; // after the last one it starts again
    track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }

  // The dots follow the scroll
  function updateDots() {
    const now = current();
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === now);
      dot.setAttribute("aria-current", i === now ? "true" : "false");
    });
  }
  track.addEventListener("scroll", updateDots, { passive: true });
  window.addEventListener("resize", updateDots);
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

  // Click: left half = before, right half = after (not when the click ends a drag)
  let downX = null;
  track.addEventListener("pointerdown", (event) => {
    downX = event.clientX;
  });
  track.addEventListener("click", (event) => {
    if (downX !== null && Math.abs(event.clientX - downX) > 6) return;
    const box = track.getBoundingClientRect();
    goTo(event.clientX - box.left < box.width / 2 ? current() - 1 : current() + 1);
  });

  // Arrow keys when the slider has the focus
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") goTo(current() - 1);
    if (event.key === "ArrowRight") goTo(current() + 1);
  });

  // The pill follows the mouse (only with a mouse, not on touch screens)
  track.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    slider.classList.add("is-pointing");
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  });
  track.addEventListener("pointerleave", () => slider.classList.remove("is-pointing"));
});
