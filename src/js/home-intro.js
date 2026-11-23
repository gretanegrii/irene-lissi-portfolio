// Home, when you open the page: the name is not there. Many asterisks (the one of the logo) come in from all the sides of the screen
// and gather to write "IRENE LISSI"; then they melt into the real letters (so the name is text, as it always was).
//
// How it works:
// 1. the real letters are on the page but hidden (the class "has-intro" on <html>, set in the head of index.html);
// 2. the script draws the same letters on a hidden canvas, in the same place, and takes the points that are inside them (the targets);
// 3. a canvas on top of the page draws an asterisk for every target: each one comes from a random point outside the screen, at its own
//    time, turning and slowing down as it arrives;
// 4. when all of them are there, the real letters fade in, the asterisks fade out and the sentence under the name appears.
// With "reduce motion", without JavaScript or if the window is resized during the animation, the name just appears.

(() => {
  const html = document.documentElement;
  const title = document.querySelector(".home__title");
  if (!title || !html.classList.contains("has-intro")) return;

  const SPRITE = "../assets/img/asterisk.png";
  const TARGET_MIN = 3600; // how many asterisks, at least (a phone) ...
  const TARGET_MAX = 12000; // ... and at most (a big screen): so many that they cover every spot inside the letters
  const OVERLAP = 2.1; // an asterisk is this many times bigger than the distance between two of them: no empty spot is left
  const FLY_MIN = 0.9; // seconds that an asterisk takes to arrive: from FLY_MIN to FLY_MIN + FLY_RANGE
  const FLY_RANGE = 0.8;
  const START_RANGE = 1.2; // each one starts at a random moment in the first seconds
  const HOLD = 0.4; // seconds that the name stays made of asterisks
  const FADE = 0.8; // seconds of the melt into the real letters

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeOutBack = (p) => {
    const c1 = 1.15;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  };

  let canvas = null;
  let raf = 0;
  let finished = false;
  const safety = setTimeout(() => finish(), 9000);

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(safety);
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", finish);
    if (canvas) canvas.remove();
    title.style.opacity = "";
    html.classList.remove("has-intro", "intro-reveal");
  }

  // --- 1. Where the asterisks go: the inside of the letters ---------------------------------------
  function findTargets() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const style = getComputedStyle(title);
    ctx.fillStyle = "#000";
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText("I");
    const ascent = metrics.fontBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent;

    // Every letter is drawn where it is on the page. The R is a drawing (svg), the others are text.
    title.querySelectorAll(".home__letter").forEach((letter) => {
      const svg = letter.querySelector("svg");
      if (svg) {
        const box = svg.getBoundingClientRect();
        const k = Math.min(box.width / 115, box.height / 140); // the viewBox of the R is 115 x 140
        ctx.save();
        ctx.translate(box.left + (box.width - 115 * k) / 2, box.top + (box.height - 140 * k) / 2);
        ctx.scale(k, k);
        svg.querySelectorAll("path").forEach((path) => ctx.fill(new Path2D(path.getAttribute("d"))));
        // the dot in the middle of the R (the pupil of its eye) is a circle: it is a target too, a few asterisks go there to build it
        svg.querySelectorAll("circle").forEach((dot) => {
          ctx.beginPath();
          ctx.arc(Number(dot.getAttribute("cx")), Number(dot.getAttribute("cy")), Number(dot.getAttribute("r")), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else {
        const box = letter.getBoundingClientRect();
        const baseline = box.top + (box.height - (ascent + descent)) / 2 + ascent;
        ctx.fillText(letter.textContent.trim(), box.left, baseline);
      }
    });

    const data = ctx.getImageData(0, 0, W, H).data;
    const inside = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      return data[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 128;
    };

    // A spot counts as "inside" also when it is just outside the edge (a little), so that the asterisks cover the edges too
    const nearInside = (x, y, reach) =>
      inside(x, y) || inside(x + reach, y) || inside(x - reach, y) || inside(x, y + reach) || inside(x, y - reach);

    // The size of the ink, to know how far apart the asterisks must be to get about the number that we want
    let ink = 0;
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (inside(x, y)) ink += 9;
    if (!ink) return null;
    // on a phone or a tablet (a finger, not a mouse) not so many: they are slower than a computer
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const wanted = Math.min(touch ? 5000 : TARGET_MAX, Math.max(TARGET_MIN, W * 8.4));
    const step = Math.min(24, Math.max(1.8, Math.sqrt(ink / (wanted * 0.87))));

    // The points, in rows that are shifted one from the other (like bricks): they fill the letters evenly, with no holes
    const points = [];
    let row = 0;
    for (let y = step / 2; y < H; y += step * 0.87, row++) {
      for (let x = (row % 2 ? step : step / 2); x < W; x += step) {
        if (nearInside(x, y, step * 0.45)) points.push({ x: x + (Math.random() - 0.5) * step * 0.3, y: y + (Math.random() - 0.5) * step * 0.3 });
      }
    }
    return { points, size: step * OVERLAP };
  }

  // --- 2. The animation ---------------------------------------------------------------------------
  function run(sprite) {
    const found = findTargets();
    if (!found || !found.points.length) {
      finish();
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = found.size;

    // The asterisk, drawn once at the right size: drawing a big picture a thousand times a frame would be slow
    const tile = document.createElement("canvas");
    tile.width = tile.height = Math.ceil(size * dpr);
    tile.getContext("2d").drawImage(sprite, 0, 0, tile.width, tile.height);

    canvas = document.createElement("canvas");
    canvas.className = "home__intro-canvas";
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    const ctx = canvas.getContext("2d");

    // The asterisks that have arrived do not move any more: they are drawn once on a second canvas, and then that canvas is
    // copied at every frame (one copy, not thousands of drawings: with so many asterisks the page would be slow)
    const settled = document.createElement("canvas");
    settled.width = canvas.width;
    settled.height = canvas.height;
    const sctx = settled.getContext("2d");

    const margin = size * 2;
    const particles = found.points.map((target) => {
      // it starts outside the screen, on a random side
      const side = Math.floor(Math.random() * 4);
      const along = Math.random();
      const from =
        side === 0 ? { x: along * W, y: -margin } : side === 1 ? { x: W + margin, y: along * H } : side === 2 ? { x: along * W, y: H + margin } : { x: -margin, y: along * H };
      return {
        from,
        to: target,
        delay: Math.random() * START_RANGE,
        duration: FLY_MIN + Math.random() * FLY_RANGE,
        turnFrom: (Math.random() - 0.5) * Math.PI * 5, // it turns while it comes
        turnTo: (Math.random() - 0.5) * 0.7, // and it ends a little tilted, each one differently
      };
    });
    const flyEnd = Math.max(...particles.map((p) => p.delay + p.duration));
    const fadeStart = flyEnd + HOLD;

    window.addEventListener("resize", finish);
    const start = performance.now();
    let revealed = false;

    const frame = (now) => {
      const t = (now - start) / 1000;
      const fade = clamp01((t - fadeStart) / FADE);
      if (fade > 0 && !revealed) {
        revealed = true;
        html.classList.add("intro-reveal"); // the sentence under the name comes in
      }
      title.style.opacity = String(fade);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1 - fade;
      ctx.drawImage(settled, 0, 0);
      for (const p of particles) {
        if (p.done) continue;
        const local = clamp01((t - p.delay) / p.duration);
        if (local <= 0) continue;
        if (local >= 1) {
          // it has arrived: from now on it is part of the settled layer
          p.done = true;
          const c = Math.cos(p.turnTo);
          const sn = Math.sin(p.turnTo);
          sctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, p.to.x * dpr, p.to.y * dpr);
          sctx.drawImage(tile, -size / 2, -size / 2, size, size);
          ctx.setTransform(dpr * c, dpr * sn, -dpr * sn, dpr * c, p.to.x * dpr, p.to.y * dpr); // and in this frame too, so it does not blink
          ctx.drawImage(tile, -size / 2, -size / 2, size, size);
          continue;
        }
        const e = easeOutBack(local);
        const x = p.from.x + (p.to.x - p.from.x) * e;
        const y = p.from.y + (p.to.y - p.from.y) * e;
        const angle = p.turnFrom + (p.turnTo - p.turnFrom) * Math.min(1, e);
        ctx.setTransform(dpr * Math.cos(angle), dpr * Math.sin(angle), -dpr * Math.sin(angle), dpr * Math.cos(angle), x * dpr, y * dpr);
        ctx.drawImage(tile, -size / 2, -size / 2, size, size);
      }

      if (fade >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  // The fonts and the asterisk have to be ready: the letters must be drawn in their real place and shape
  const sprite = new Image();
  sprite.src = SPRITE;
  // (if the fonts are slow, it does not wait for them for more than a second: the name must not stay hidden)
  const fontsReady = Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1000))]);
  Promise.all([fontsReady, sprite.decode().catch(() => {})])
    .then(() => requestAnimationFrame(() => run(sprite)))
    .catch(() => finish());
})();
