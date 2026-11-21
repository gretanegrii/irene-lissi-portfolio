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
    // Going on after the last picture (or back before the first one) jumps straight to the other end:
    // sliding back through all the pictures would look like they are going the wrong way.
    const wraps = index < 0 || index >= slides.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion.matches || wraps ? "auto" : "smooth" });
  }

  // If the slider has a caption next to it and the pictures have their own (data-caption), the caption changes
  // with the picture that is shown
  const caption = slider.parentElement.querySelector(":scope > .case__caption");
  if (caption) caption.setAttribute("aria-live", "polite");

  // The dots (and the caption) follow the scroll
  function updateDots() {
    const now = current();
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === now);
      dot.setAttribute("aria-current", i === now ? "true" : "false");
    });
    // A video that is no longer shown stops
    track.querySelectorAll("video").forEach((video, i) => {
      if (i !== now && !video.paused) video.pause();
    });
    const text = slides[now] && slides[now].dataset.caption;
    if (caption && text && caption.innerHTML !== text) caption.innerHTML = text;
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
    if (event.target.closest("video")) return; // the video has its own controls
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
    // Over a video the normal pointer comes back (the controls), and the pill goes away
    if (event.target.closest("video")) return slider.classList.remove("is-pointing");
    slider.classList.add("is-pointing");
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
  });
  track.addEventListener("pointerleave", () => slider.classList.remove("is-pointing"));
});
