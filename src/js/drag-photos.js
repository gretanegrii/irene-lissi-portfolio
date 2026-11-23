// About: the photos stuck on the page can be picked up and thrown around, like real polaroids.
// - when you grab one it straightens up, gets bigger and lifts (a bigger shadow, from the CSS: .is-held)
// - while you move it, it swings a little the way you are going (the faster, the more it tilts)
// - when you let it go it keeps gliding for a moment, then lands with a new, random tilt (with a small bounce)
// The drag uses the "translate", "rotate" and "scale" properties, so it does not fight with the vertical shift of parallax.js,
// which uses "transform". It works with the mouse and with a finger (pointer events).

(() => {
  const photos = [...document.querySelectorAll(".about__photo")];
  if (!photos.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let zTop = 10; // the photo you touched last stays on top of the other ones

  photos.forEach((photo) => {
    let x = 0; // how far the photo has been moved from its place (px)
    let y = 0;
    let startX = 0; // where the pointer was, and where the photo was, when you grabbed it
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let vx = 0; // speed of the pointer (px per frame), smoothed
    let vy = 0;
    let lastX = 0;
    let lastY = 0;
    let held = false;
    let glide = 0; // id of the animation frame of the glide

    photo.draggable = false;

    const place = () => {
      photo.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    };

    function onDown(event) {
      if (event.button !== undefined && event.button !== 0) return; // only the main button
      event.preventDefault();
      cancelAnimationFrame(glide);
      held = true;
      photo.setPointerCapture(event.pointerId);
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      baseX = x;
      baseY = y;
      vx = vy = 0;
      photo.style.zIndex = String(++zTop);
      photo.classList.add("is-held");
      photo.style.scale = "1.14";
      photo.style.rotate = "0deg";
    }

    function onMove(event) {
      if (!held) return;
      x = baseX + (event.clientX - startX);
      y = baseY + (event.clientY - startY);
      place();
      // speed of the pointer, smoothed so the swing is not nervous
      vx = vx * 0.7 + (event.clientX - lastX) * 0.3;
      vy = vy * 0.7 + (event.clientY - lastY) * 0.3;
      lastX = event.clientX;
      lastY = event.clientY;
      if (!reducedMotion) photo.style.rotate = `${clamp(vx * 1.4, -22, 22).toFixed(1)}deg`;
    }

    function land() {
      // a new random tilt, never too straight (it would look like a mistake)
      const tilt = (3 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1);
      photo.classList.remove("is-held");
      photo.classList.add("is-landing"); // the CSS gives it a bouncy transition
      photo.style.scale = "1";
      photo.style.rotate = `${tilt.toFixed(1)}deg`;
      setTimeout(() => photo.classList.remove("is-landing"), 700);
    }

    function onUp() {
      if (!held) return;
      held = false;
      if (reducedMotion) {
        land();
        return;
      }
      // it keeps going in the direction you threw it, slowing down
      const step = () => {
        vx *= 0.89;
        vy *= 0.89;
        x += vx;
        y += vy;
        place();
        if (Math.abs(vx) + Math.abs(vy) > 0.4) {
          glide = requestAnimationFrame(step);
        }
      };
      glide = requestAnimationFrame(step);
      land();
    }

    photo.addEventListener("pointerdown", onDown);
    photo.addEventListener("pointermove", onMove);
    photo.addEventListener("pointerup", onUp);
    photo.addEventListener("pointercancel", onUp);
  });
})();
