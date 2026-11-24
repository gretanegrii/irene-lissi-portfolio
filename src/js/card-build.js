// Logopedista case study: the construction of the two sides of the card, side by side, like a time-lapse. One clock for both.
// Front: the paper comes in, the blue stain with its tulips spreads from the bottom-left corner, the red one from the bottom-right,
// the sun from the top-right, and the sentence is written line by line, as a child would.
// Back: the name and "logopedista" are written, the four tulips grow one after the other from their stems, then the studio and the
// phone number are written.
// At the end the construction turns into the finished card, the one of the first picture. It stays for a moment, fades away and
// starts again. It plays only while the cards are on the screen.
// Without JavaScript, or with "reduce motion", it just shows the finished cards.

(() => {
  const cards = [...document.querySelectorAll("[data-card-build]")];
  if (!cards.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const END = 10.2; // finished until here, then it fades away
  const CYCLE = 11.3;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const prog = (t, start, dur) => clamp01((t - start) / dur);
  const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const out = (p) => 1 - Math.pow(1 - p, 3);

  // A stain that spreads from a corner: a circle with a soft edge that grows (the part inside is shown)
  function spread(el, corner, p, reach) {
    const r = p * reach;
    const mask = p <= 0 ? "linear-gradient(transparent, transparent)" : `radial-gradient(circle at ${corner}, #000 ${Math.max(0, r - 14)}%, transparent ${r}%)`;
    el.style.webkitMaskImage = mask;
    el.style.maskImage = mask;
  }

  // Something written: a band of the card (from the top, in %) is uncovered from left to right
  function write(el, p, top, bottom, left = 0, right = 100) {
    el.style.clipPath = `inset(${top}% ${100 - right + (1 - p) * (right - left)}% ${100 - bottom}% ${left}%)`;
  }

  // Something that grows: a band of the card is uncovered from the bottom to the top, like a stem
  function grow(el, p, top, bottom) {
    el.style.clipPath = `inset(${top + (1 - p) * (bottom - top)}% 0 ${100 - bottom}% 0)`;
  }

  // The frame that every card has: the paper comes in, and at the end the card fades away
  function frame(card, t, finalAt) {
    const paper = card.querySelector(".case__card-paper");
    const final = card.querySelector('[data-layer="final"]');
    const pCard = out(prog(t, 0, 0.7));
    paper.style.opacity = pCard;
    card.style.opacity = (pCard * (1 - inOut(prog(t, END, 0.7)))).toFixed(3);
    card.style.transform = `translateY(${(1 - pCard) * 14}px) scale(${0.97 + 0.03 * pCard})`;
    final.style.opacity = inOut(prog(t, finalAt, 1.0));
  }

  const renderers = {
    front(card) {
      const layer = (name) => card.querySelector(`[data-layer="${name}"]`);
      const blue = layer("blue");
      const red = layer("red");
      const sun = layer("sun");
      const lines = [layer("line-1"), layer("line-2"), layer("line-3")];
      // The three lines of the sentence, as bands of the card (from the top, in %): each copy of the text shows only its own band
      const bands = [
        [0, 32],
        [32, 52],
        [52, 100],
      ];
      const starts = [4.7, 6.0, 6.6];
      const durs = [1.3, 0.5, 1.3];
      return (t) => {
        frame(card, t, 8.0);
        spread(blue, "0% 100%", inOut(prog(t, 0.8, 1.7)), 130);
        spread(red, "100% 100%", inOut(prog(t, 1.9, 1.7)), 130);
        spread(sun, "100% 0%", inOut(prog(t, 3.2, 1.2)), 75);
        lines.forEach((el, i) => write(el, prog(t, starts[i], durs[i]), bands[i][0], bands[i][1]));
      };
    },

    back(card) {
      const layer = (name) => card.querySelector(`[data-layer="${name}"]`);
      const name = layer("name");
      const role = layer("role");
      const address = layer("address");
      const phone = layer("phone");
      // The tulips, from the left: each one grows in the band of the card where the tulips are (from the top, in %)
      const tulips = ["red", "blue", "green", "yellow"].map(layer);
      return (t) => {
        frame(card, t, 8.2);
        write(name, inOut(prog(t, 0.9, 1.3)), 0, 17);
        write(role, inOut(prog(t, 2.3, 1.2)), 17, 31);
        tulips.forEach((el, i) => grow(el, inOut(prog(t, 3.7 + i * 0.6, 1.1)), 33, 71));
        write(address, inOut(prog(t, 6.3, 1.0)), 72, 100, 0, 62);
        write(phone, inOut(prog(t, 7.2, 0.8)), 72, 100, 62, 100);
      };
    },
  };

  const items = cards.map((card) => ({ card, render: renderers[card.dataset.cardBuild](card) }));
  const render = (t) => items.forEach((item) => item.render(t));
  render(0);
  cards.forEach((card) => (card.renderAt = render)); // (to look at one moment of the animation)

  // --- Run: only while a card is on the screen -----------------------------------------------------------
  let raf = 0;
  let elapsed = 0;
  let last = 0;
  const visible = new Set();

  function tick(now) {
    elapsed += (now - last) / 1000;
    last = now;
    render(elapsed % CYCLE);
    raf = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
      if (visible.size && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!visible.size && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { threshold: 0.35 }
  );
  cards.forEach((card) => observer.observe(card));
})();
