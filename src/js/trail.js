// Home: a trail of pictures follows the cursor (or the finger, when you drag it), like the home of madeinhaus.com.
// The same picture comes out three times in a row, then another one three times, then another one, in a random order:
// so the cursor leaves a strip of different pictures. They come out at once and go away at once, after a short time.
// The pictures (cutouts, in assets/img/home-trail) are chosen by Irene, among the things she loves.

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return;

  const FILES = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `../assets/img/home-trail/trail-${n}.png`);
  const STAMPS_PER_PICTURE = 3; // the same picture comes out three times, then the next one
  const LIFE = 450; // ms a picture stays before it is gone (at once, without fading)
  const MAX_ON_SCREEN = 22; // the oldest ones are reused, the page does not fill up

  const layer = document.querySelector(".home__trail");
  if (!layer) return;

  // --- The pictures, loaded in advance --------------------------------------------------
  const pictures = FILES.map((src) => {
    const img = new Image();
    img.src = src;
    img.alt = "";
    return img;
  });

  // The order is random: every picture comes out once before any of them comes out again,
  // and the same one never comes twice in a row
  let bag = [];
  let last = -1;
  function nextPicture() {
    if (!bag.length) {
      bag = pictures.map((_, i) => i).sort(() => Math.random() - 0.5);
      if (bag[bag.length - 1] === last) bag.unshift(bag.pop()); // the next one (the last of the bag) is not the same as the previous one
    }
    last = bag.pop();
    return last;
  }

  let current = nextPicture();
  let stamps = 0; // how many times the current picture has come out

  // --- Where a picture comes out --------------------------------------------------------
  // Every time the cursor has moved a bit more than half of the width of a picture, a picture comes out:
  // so the three copies of the same picture overlap a little but can be told apart
  const pictureWidth = () => Math.min(300, Math.max(110, window.innerWidth * 0.155));
  const stepLength = () => pictureWidth() * 0.55;

  const pool = []; // the pictures on the screen, from the oldest to the newest
  let lastX = null;
  let lastY = null;
  let travelled = 0;

  function stamp(x, y) {
    const source = pictures[current];
    const width = pictureWidth();
    const ratio = source.naturalHeight && source.naturalWidth ? source.naturalHeight / source.naturalWidth : 1;
    const height = Math.min(width * ratio, width * 1.25);
    const widthFinal = height === width * 1.25 && ratio > 1.25 ? width * 1.25 / ratio : width;

    let el;
    if (pool.length >= MAX_ON_SCREEN) {
      el = pool.shift();
    } else {
      el = document.createElement("img");
      el.className = "home__trail-img";
      el.alt = "";
      el.draggable = false;
      layer.append(el);
    }
    pool.push(el);
    el.src = source.src;
    el.style.width = `${widthFinal}px`;
    el.style.height = `${height}px`;

    const tilt = (Math.random() * 2 - 1) * 9; // a little rotation, different every time
    const jitterX = (Math.random() * 2 - 1) * 8;
    const jitterY = (Math.random() * 2 - 1) * 8;
    // It is there at once (no fade, no growing) and it is gone at once, after a short time
    el.style.transform = `translate(${x - widthFinal / 2 + jitterX}px, ${y - height / 2 + jitterY}px) rotate(${tilt}deg)`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      const i = pool.indexOf(el);
      if (i > -1) pool.splice(i, 1);
      el.remove();
    }, LIFE);

    stamps += 1;
    if (stamps >= STAMPS_PER_PICTURE) {
      stamps = 0;
      current = nextPicture();
    }
  }

  // A movement of the cursor, of the finger, or of the "ghost" cursor that goes by itself (below)
  function travel(x, y) {
    if (lastX === null) {
      lastX = x;
      lastY = y;
      return;
    }
    travelled += Math.hypot(x - lastX, y - lastY);
    lastX = x;
    lastY = y;
    if (travelled >= stepLength()) {
      travelled = 0;
      stamp(x, y);
    }
  }

  // --- When nobody moves the cursor: the trail goes by itself all over the screen ----------------------
  // On a device without a cursor (phone, tablet), after a short stillness, an invisible cursor travels on a long curve
  // that covers the whole screen, and leaves the same trail. As soon as the real cursor (or a finger) moves, it stops;
  // when it is still again for a moment, the trail starts again by itself.
  const IDLE_BEFORE_AUTO = 1500; // ms of stillness before the trail goes by itself (the first time: a little less)
  const AUTO_SPEED = 1.3; // how fast the invisible cursor travels (radians per second of the curve)

  let lastUserMove = performance.now() - IDLE_BEFORE_AUTO + 600; // at the start it begins after 0.6 s
  let autoRunning = false;
  let autoTime = 0;
  let autoPrevious = 0;
  // each time the curve is a little different: its frequencies and its starting point are random
  const curve = {
    fx: 1.0 + Math.random() * 0.25,
    fy: 1.55 + Math.random() * 0.3,
    px: Math.random() * Math.PI * 2,
    py: Math.random() * Math.PI * 2,
  };

  // The trail that goes by itself is only for the devices without a cursor (phone, tablet): on a computer the pictures
  // come out only when you move the cursor. (Checked at every step: a computer with a touch screen is a computer.)
  const hasCursor = window.matchMedia("(hover: hover) and (pointer: fine)");

  function autoStep(now) {
    if (hasCursor.matches) {
      autoRunning = false;
      requestAnimationFrame(autoStep);
      return;
    }
    if (document.hidden) {
      autoPrevious = now;
      requestAnimationFrame(autoStep);
      return;
    }
    const idle = now - lastUserMove >= IDLE_BEFORE_AUTO;
    if (idle) {
      if (!autoRunning) {
        autoRunning = true;
        lastX = null; // a new strip starts: nothing jumps from where the last one ended
        travelled = 0;
        autoPrevious = now;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      // on a small screen the curve is smaller: it goes round a bit faster, so the trail has the same speed in pixels
      const sizeFactor = Math.min(2, Math.max(0.7, 1000 / ((w + h) / 2)));
      autoTime += ((now - autoPrevious) / 1000) * AUTO_SPEED * sizeFactor;
      autoPrevious = now;
      // two waves of different speed: the point goes to the corners and through the middle of the screen
      const x = w * (0.5 + 0.44 * Math.sin(autoTime * curve.fx + curve.px));
      const y = h * (0.5 + 0.4 * Math.sin(autoTime * curve.fy + curve.py));
      travel(x, y);
    } else {
      autoRunning = false;
    }
    requestAnimationFrame(autoStep);
  }

  function userMoved() {
    lastUserMove = performance.now();
    if (autoRunning) {
      autoRunning = false;
      lastX = null; // the real cursor starts its own strip
      travelled = 0;
    }
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      userMoved();
      travel(event.clientX, event.clientY);
    },
    { passive: true }
  );

  // A new touch starts a new strip: no picture jumps from where the last one ended
  window.addEventListener("pointerdown", (event) => {
    userMoved();
    lastX = event.clientX;
    lastY = event.clientY;
    travelled = 0;
  });

  requestAnimationFrame(autoStep);
})();
