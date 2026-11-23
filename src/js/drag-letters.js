// Home: the letters of the name can be picked up and thrown around, like the polaroids of the "Su di me" page (js/drag-photos.js).
// - when you grab a letter it straightens up, gets bigger and lifts (a shadow, from the CSS: .is-held)
// - while you move it, it swings a little the way you are going (the faster, the more it tilts)
// - when you let it go it keeps gliding for a moment, then lands with a new, random tilt (with a small bounce)
// - a letter cannot leave the screen: it stops at the edges (and under the navbar)
// - a double click (or a double tap) on the page puts all the letters back in their place
// It uses the "translate", "rotate" and "scale" properties, so it does not fight with the other things that move the letters.
// It works with the mouse and with a finger (pointer events). When a letter is the asterisk (home.js) it can be moved too.

(() => {
  const letters = [...document.querySelectorAll(".home__letter")];
  if (!letters.length) return;

  const hint = document.querySelector(".home__hint");
  const HINT_START = "trascina le lettere";
  const HINT_MOVED = "doppio clic per rimetterle a posto";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const EDGE = 8; // px that a letter keeps from the edges of the screen
  const TOP = 64; // the navbar
  const BOTTOM = 56; // the footer
  let zTop = 10; // the letter you touched last stays on top of the other ones
  let moved = 0; // how many letters are away from their place

  const setHint = (text) => {
    if (hint) hint.textContent = text;
  };

  const resets = [];

  letters.forEach((letter) => {
    let x = 0; // how far the letter has been moved from its place (px)
    let y = 0;
    let startX = 0; // where the pointer was, and where the letter was, when you grabbed it
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let minX = 0; // how far it can go, from its place
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    let vx = 0; // speed of the pointer (px per frame), smoothed
    let vy = 0;
    let lastX = 0;
    let lastY = 0;
    let held = false;
    let away = false; // is it away from its place?
    let glide = 0; // id of the animation frame of the glide

    const place = () => {
      letter.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    };

    const markAway = (value) => {
      if (value === away) return;
      away = value;
      moved += value ? 1 : -1;
      setHint(moved > 0 ? HINT_MOVED : HINT_START);
    };

    function onDown(event) {
      if (event.button !== undefined && event.button !== 0) return; // only the main button
      event.preventDefault();
      cancelAnimationFrame(glide);
      letter.classList.remove("is-returning");
      held = true;
      letter.setPointerCapture(event.pointerId);
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      baseX = x;
      baseY = y;
      vx = vy = 0;

      // where the letter would be without any move: from there, how far it can go before it leaves the screen
      const box = letter.getBoundingClientRect();
      const homeLeft = box.left - x;
      const homeTop = box.top - y;
      minX = EDGE - homeLeft;
      maxX = window.innerWidth - EDGE - (homeLeft + box.width);
      minY = TOP - homeTop;
      maxY = window.innerHeight - BOTTOM - (homeTop + box.height);

      letter.style.zIndex = String(++zTop);
      letter.classList.add("is-held");
      letter.style.scale = "1.12";
      letter.style.rotate = "0deg";
    }

    function onMove(event) {
      if (!held) return;
      x = clamp(baseX + (event.clientX - startX), minX, maxX);
      y = clamp(baseY + (event.clientY - startY), minY, maxY);
      place();
      // speed of the pointer, smoothed so the swing is not nervous
      vx = vx * 0.7 + (event.clientX - lastX) * 0.3;
      vy = vy * 0.7 + (event.clientY - lastY) * 0.3;
      lastX = event.clientX;
      lastY = event.clientY;
      if (!reducedMotion) letter.style.rotate = `${clamp(vx * 1.4, -22, 22).toFixed(1)}deg`;
    }

    function land() {
      // a new random tilt, never too straight (it would look like a mistake)
      const tilt = (2 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1);
      letter.classList.remove("is-held");
      letter.classList.add("is-landing"); // the CSS gives it a bouncy transition
      letter.style.scale = "1";
      letter.style.rotate = `${tilt.toFixed(1)}deg`;
      setTimeout(() => letter.classList.remove("is-landing"), 700);
    }

    function onUp() {
      if (!held) return;
      held = false;
      markAway(Math.abs(x) + Math.abs(y) > 4);
      if (reducedMotion) {
        land();
        return;
      }
      // it keeps going in the direction you threw it, slowing down, and it stops at the edges
      const step = () => {
        vx *= 0.89;
        vy *= 0.89;
        x = clamp(x + vx, minX, maxX);
        y = clamp(y + vy, minY, maxY);
        if (x === minX || x === maxX) vx = 0;
        if (y === minY || y === maxY) vy = 0;
        place();
        if (Math.abs(vx) + Math.abs(vy) > 0.4) {
          glide = requestAnimationFrame(step);
        }
      };
      glide = requestAnimationFrame(step);
      land();
    }

    // Back in its place, with a smooth move
    resets.push(() => {
      cancelAnimationFrame(glide);
      held = false;
      x = y = 0;
      letter.classList.remove("is-held", "is-landing");
      letter.classList.add("is-returning");
      letter.style.translate = "0px 0px";
      letter.style.rotate = "0deg";
      letter.style.scale = "1";
      markAway(false);
      setTimeout(() => letter.classList.remove("is-returning"), 800);
    });

    letter.addEventListener("pointerdown", onDown);
    letter.addEventListener("pointermove", onMove);
    letter.addEventListener("pointerup", onUp);
    letter.addEventListener("pointercancel", onUp);
  });

  // A double click (or a double tap) on the page: every letter goes back
  document.querySelector(".home")?.addEventListener("dblclick", () => {
    resets.forEach((reset) => reset());
  });

  setHint(HINT_START);
})();
