// Reblend case study: the construction of the logo, drawn in the page (SVG, no background), like a time-lapse.
// The letters and the symbol that takes the place of the E are built together: first the guides, the circles of the symbol and
// the circles of the rounded corners, then the outlines draw themselves, they fill in gray, then black, the construction goes
// away and the payoff comes in. It plays when the logo comes into view and it goes round and round.
// Without JavaScript, or with "reduce motion", it just shows the finished logo.

(() => {
  const svg = document.querySelector("[data-logo-build]");
  if (!svg) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const NS = "http://www.w3.org/2000/svg";
  const finals = [...svg.querySelectorAll(".lb-final")];
  const payoff = svg.querySelector(".lb-payoff");
  const guides = [...svg.querySelectorAll(".lb-guide")];
  const ellipses = [...svg.querySelectorAll(".lb-ellipse")];
  const corners = [...svg.querySelectorAll(".lb-corner")];
  const construction = svg.querySelector(".lb-construction");
  const guideGroup = svg.querySelector(".lb-guides");
  const lettersGroup = svg.querySelector(".lb-letters");

  // For each letter: an outline (it draws itself) and a light fill, under the black one
  const layers = finals.map((path) => {
    const outline = document.createElementNS(NS, "path");
    const gray = document.createElementNS(NS, "path");
    [outline, gray].forEach((p) => {
      p.setAttribute("d", path.getAttribute("d"));
      p.setAttribute("fill-rule", "evenodd");
    });
    outline.setAttribute("class", "lb-outline");
    gray.setAttribute("class", "lb-gray");
    lettersGroup.insertBefore(gray, path);
    lettersGroup.insertBefore(outline, path);
    return { path, outline, gray };
  });
  // The lines that draw themselves: a dash as long as the line, moved along it (the length is measured here)
  const drawn = (el) => {
    const length = el.getTotalLength();
    el.style.strokeDasharray = length + " " + length;
    el.dataset.len = length;
    return el;
  };
  guides.forEach(drawn);
  ellipses.forEach(drawn);
  layers.forEach((layer) => drawn(layer.outline));
  const draw = (el, p) => {
    el.style.strokeDashoffset = Number(el.dataset.len) * (1 - p);
  };

  // --- Timeline (seconds) ---------------------------------------------------------------------------
  const END = 10.2; // the logo stays finished until here, then it fades away
  const CYCLE = 11.3;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const prog = (t, start, dur) => clamp01((t - start) / dur);
  const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const outBack = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

  function render(t) {
    // the construction (guides, circles) comes in, and goes away when the letters are black
    const fadeConstruction = 1 - inOut(prog(t, 4.7, 0.9));
    guideGroup.style.opacity = fadeConstruction * 0.45;
    construction.style.opacity = fadeConstruction * 0.55;
    guides.forEach((g, i) => draw(g, inOut(prog(t, 0.05 + i * 0.15, 1.0))));
    ellipses.forEach((e, i) => draw(e, inOut(prog(t, 0.25 + i * 0.2, 1.1))));
    corners.forEach((c, i) => {
      const letter = Number(c.dataset.l);
      const p = outBack(prog(t, 0.6 + letter * 0.38 + (i % 5) * 0.05, 0.5));
      c.style.opacity = clamp01(p);
      c.style.transform = "scale(" + Math.max(p, 0.001) + ")";
    });
    layers.forEach((layer, k) => {
      const symbol = k === 4;
      draw(layer.outline, inOut(prog(t, symbol ? 2.0 : 1.6 + k * 0.25, symbol ? 1.7 : 1.3)));
      layer.outline.style.opacity = 1 - inOut(prog(t, 4.6, 0.8));
      layer.gray.style.opacity = inOut(prog(t, 2.9 + k * 0.12, 0.7)) * 0.16;
      layer.path.style.opacity = inOut(prog(t, 4.3 + k * 0.07, 0.7));
    });
    const pp = inOut(prog(t, 5.5, 0.9));
    payoff.style.opacity = pp;
    payoff.style.transform = "translateY(" + (1 - pp) * 14 + "px)";
    svg.style.opacity = 1 - inOut(prog(t, END, 0.7));
  }

  // --- Run: only while the logo is on the screen ------------------------------------------------------
  let raf = 0;
  let elapsed = 0;
  let last = 0;

  function frame(now) {
    elapsed += (now - last) / 1000;
    last = now;
    render(elapsed % CYCLE);
    raf = requestAnimationFrame(frame);
  }

  svg.classList.add("is-animated");
  svg.renderAt = render; // (to look at one moment of the animation)
  render(0);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!raf) {
            if (elapsed === 0) elapsed = 0;
            last = performance.now();
            raf = requestAnimationFrame(frame);
          }
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
    },
    { threshold: 0.35 }
  );
  observer.observe(svg);
})();
