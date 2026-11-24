// NCA case study: two small time-lapses about the logo, drawn in the page (SVG, no background).
//  1. "Dal carattere di partenza al logo" (data-nca-evolution): the letters in the starting font, the arrow, the rounded version
//     in gray and, at the end, the final logo in black.
//  2. "Costruzione e area di rispetto" (data-nca-build): the rectangle that measures the logo draws itself, then the letters
//     (outline, light fill, black) and, at the end, the four circles of the clear space.
//  3. "Le versioni" (data-nca-version, two of them): the letters of the logo pop in, then the words "Naba Communication Award"
//     come in letter by letter, along the line they follow (tilted in the horizontal version, straight in the vertical one).
//  4. "Il logo nei layout" (data-nca-layouts): for each version of the logo, the pages with the red guides draw themselves one
//     after the other and the logo lands in its place.
// Each one plays when it comes into view and goes round and round.
// Without JavaScript, or with "reduce motion", they just show the finished picture.

(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const NS = "http://www.w3.org/2000/svg";
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const prog = (t, start, dur) => clamp01((t - start) / dur);
  const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const outBack = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

  // The lines that draw themselves: a dash as long as the line, moved along it
  const drawn = (el) => {
    const length = el.getTotalLength();
    el.style.strokeDasharray = length + " " + length;
    el.dataset.len = length;
    return el;
  };
  const draw = (el, p) => {
    el.style.strokeDashoffset = Number(el.dataset.len) * (1 - p);
  };

  // An outline that draws itself (and, optionally, a light fill) under each letter, in the same group
  function addLayers(paths, outlineClass, grayClass) {
    return paths.map((path) => {
      const outline = document.createElementNS(NS, "path");
      outline.setAttribute("d", path.getAttribute("d"));
      outline.setAttribute("fill-rule", "evenodd");
      outline.setAttribute("class", outlineClass);
      path.parentNode.insertBefore(outline, path);
      let gray = null;
      if (grayClass) {
        gray = document.createElementNS(NS, "path");
        gray.setAttribute("d", path.getAttribute("d"));
        gray.setAttribute("fill-rule", "evenodd");
        gray.setAttribute("class", grayClass);
        path.parentNode.insertBefore(gray, outline);
      }
      return { path, outline: drawn(outline), gray };
    });
  }

  // Plays `render(t)` while the picture is on the screen, round and round
  function run(svg, render) {
    let raf = 0;
    let elapsed = 0;
    let last = 0;
    const frame = (now) => {
      elapsed += (now - last) / 1000;
      last = now;
      render(elapsed);
      raf = requestAnimationFrame(frame);
    };
    svg.classList.add("is-animated");
    svg.renderAt = (t) => render(t); // (to look at one moment of the animation)
    render(0);
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!raf) {
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
    ).observe(svg);
  }

  // --- 1. From the starting font to the logo -----------------------------------------------------------
  const evo = document.querySelector("[data-nca-evolution]");
  if (evo) {
    const CYCLE = 11;
    const END = 9.8; // finished until here, then it fades away
    const start = addLayers([...evo.querySelectorAll(".eb-start .eb-letter")], "eb-outline eb-outline--start");
    const round = addLayers([...evo.querySelectorAll(".eb-round .eb-letter")], "eb-outline eb-outline--round");
    const final = addLayers([...evo.querySelectorAll(".eb-final .eb-letter")], "eb-outline eb-outline--final");
    const line = drawn(evo.querySelector(".eb-arrow-line"));
    const head = evo.querySelector(".eb-arrow-head");

    // each letter: the outline draws itself, then the fill comes in
    const letters = (list, t0, step, dur) =>
      list.forEach((l, k) => {
        draw(l.outline, inOut(prog(t, t0 + k * step, dur)));
        l.outline.style.opacity = 1 - inOut(prog(t, t0 + k * step + dur * 0.8, 0.5));
        l.path.style.opacity = inOut(prog(t, t0 + k * step + dur * 0.55, 0.6));
      });
    let t = 0;
    run(evo, (time) => {
      t = time % CYCLE;
      letters(start, 0.2, 0.3, 1.1);
      draw(line, inOut(prog(t, 2.3, 0.9)));
      head.style.opacity = inOut(prog(t, 3.0, 0.3));
      letters(round, 3.4, 0.3, 1.1);
      letters(final, 5.3, 0.25, 1.5);
      evo.style.opacity = 1 - inOut(prog(t, END, 0.7));
    });
  }

  // --- 3. The two extended versions ----------------------------------------------------------------------
  [...document.querySelectorAll("[data-nca-version]")].forEach((v, n) => {
    const CYCLE = 10.6;
    const END = 9.2;
    const label = v.querySelector(".vb-label");
    const letters = [...v.querySelectorAll(".vb-letter")];
    const glyphs = [...v.querySelectorAll(".vb-glyph")];
    const delay = n * 0.5; // the second one starts a little later
    run(v, (time) => {
      const t = Math.max(0, (time % CYCLE) - delay);
      label.style.opacity = inOut(prog(t, 0, 0.6));
      letters.forEach((l, i) => {
        const p = outBack(prog(t, 0.4 + i * 0.16, 0.7));
        l.style.opacity = clamp01(p * 2);
        l.style.transform = "scale(" + Math.max(0.001, 0.6 + 0.4 * p) + ")";
      });
      glyphs.forEach((g, k) => {
        const p = inOut(prog(t, 2.0 + k * 0.08, 0.5));
        g.style.opacity = p;
        g.style.transform = "translateY(" + (1 - p) * 8 + "px)";
      });
      v.style.opacity = 1 - inOut(prog(time % CYCLE, END, 0.7));
    });
  });

  // --- 4. The logo in the layouts ---------------------------------------------------------------------------
  const lay = document.querySelector("[data-nca-layouts]");
  if (lay) {
    const CYCLE = 10;
    const END = 8.8;
    const origin = (el) => {
      el.style.transformOrigin = el.dataset.cx + "px " + el.dataset.cy + "px";
      return el;
    };
    const rows = [...lay.querySelectorAll(".nl-row")].map((row) => ({
      main: origin(row.querySelector(".nl-main")),
      pages: [...row.querySelectorAll(".nl-page")].map((page) => ({
        frame: drawn(page.querySelector(".nl-frame")),
        guides: [...page.querySelectorAll(".nl-guide")].map(drawn),
        slot: page.querySelector(".nl-slot"),
        logo: origin(page.querySelector(".nl-logo")),
      })),
    }));
    const pop = (el, p) => {
      el.style.opacity = clamp01(p * 2);
      el.style.transform = "scale(" + Math.max(0.001, 0.6 + 0.4 * p) + ")";
    };

    run(lay, (time) => {
      const t = time % CYCLE;
      rows.forEach((row, r) => {
        const off = r * 3.2 * 0.5;
        pop(row.main, outBack(prog(t, off, 0.8)));
        row.pages.forEach((page, k) => {
          const b = off + 0.5 + k * 0.4;
          draw(page.frame, inOut(prog(t, b, 0.6)));
          page.guides.forEach((g, i) => draw(g, inOut(prog(t, b + 0.2 + i * 0.05, 0.7))));
          page.slot.style.opacity = inOut(prog(t, b + 0.8, 0.3)) * (1 - inOut(prog(t, b + 1.3, 0.3)));
          pop(page.logo, outBack(prog(t, b + 1.3, 0.6)));
        });
      });
      lay.style.opacity = 1 - inOut(prog(t, END, 0.7));
    });
  }

  // --- 2. Construction and clear space -------------------------------------------------------------------
  const svg = document.querySelector("[data-nca-build]");
  if (svg) {
    const CYCLE = 10.5;
    const END = 9.2;
    const rect = drawn(svg.querySelector(".nb-rect"));
    const layers = addLayers([...svg.querySelectorAll(".nb-final")], "nb-outline", "nb-gray");
    const circles = [...svg.querySelectorAll(".nb-circle")];

    run(svg, (time) => {
      const t = time % CYCLE;
      draw(rect, inOut(prog(t, 0.1, 1.5)));
      rect.style.fillOpacity = inOut(prog(t, 1.3, 0.9));
      layers.forEach((layer, k) => {
        draw(layer.outline, inOut(prog(t, 1.3 + k * 0.3, 1.4)));
        layer.outline.style.opacity = 1 - inOut(prog(t, 3.8, 0.6));
        layer.gray.style.opacity = inOut(prog(t, 2.5 + k * 0.12, 0.7)) * 0.16;
        layer.path.style.opacity = inOut(prog(t, 3.6 + k * 0.1, 0.7));
      });
      circles.forEach((c, i) => {
        const p = outBack(prog(t, 4.8 + i * 0.25, 0.6));
        c.style.opacity = clamp01(p);
        c.style.transform = "scale(" + Math.max(p, 0.001) + ")";
      });
      svg.style.opacity = 1 - inOut(prog(t, END, 0.7));
    });
  }
})();
