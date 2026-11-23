// Home: the color of the page changes every few seconds, going through the colors of the work strips
// (same colors, same order as in work.html). The change is smooth (see the transition in home.css).
// A new color every 4.5 seconds (madeinhaus.com does it about every 7).

const COLORS = [
  "#f089ba", // Reblend
  "#f0df89", // Logopedista
  "#89e6f0", // Studio
  "#e789f0", // NCA
  "#8bb6ee", // Staedtler
  "#f0a489", // CMD Z
  "#c189f0", // Vibe
  "#5b84ee", // Anti-Violence Campaign
  "#8dede8", // Interview
  "#f0dd89", // Quieta Distanza
  "#f0bf89", // Karibujua
  "#bd92e8", // Dualita
  "#d9e594", // Life/Leaf
];
const INTERVAL = 4500; // ms between one color and the next

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reducedMotion.matches) {
  let index = 0; // the page starts with the first color (set in home.css)

  setInterval(() => {
    index = (index + 1) % COLORS.length;
    document.body.style.setProperty("--page-bg", COLORS[index]);
  }, INTERVAL);
}

// --- The letters of the name ---------------------------------------------------
// Every now and then a random letter turns into the asterisk of the logo for a moment,
// then goes back to being a letter (like the letters of madeinhaus.com that change shape).

const LETTERS = [...document.querySelectorAll(".home__letter")];
const EVERY = 1400; // ms between one change and the next
const STAYS = 1100; // ms a letter stays an asterisk

const AFTER_INTRO = 600; // ms between the moment the name is there and the start of the changes (the first one comes EVERY ms after that)

// The changes start a little after the name has appeared: when the page opens the name is built by the asterisks (js/home-intro.js,
// the class "has-intro" is on <html> until it is done), and the letters must not change before that
function whenTheNameIsThere(start) {
  const html = document.documentElement;
  if (!html.classList.contains("has-intro")) {
    setTimeout(start, AFTER_INTRO);
    return;
  }
  const watcher = new MutationObserver(() => {
    if (!html.classList.contains("has-intro")) {
      watcher.disconnect();
      setTimeout(start, AFTER_INTRO);
    }
  });
  watcher.observe(html, { attributes: true, attributeFilter: ["class"] });
}

if (!reducedMotion.matches && LETTERS.length) {
  whenTheNameIsThere(() => {
    let previous = -1;

    setInterval(() => {
      // a letter different from the last one
      let n;
      do {
        n = Math.floor(Math.random() * LETTERS.length);
      } while (n === previous);
      previous = n;

      const letter = LETTERS[n];
      const star = document.createElement("img");
      star.className = "home__star";
      star.src = "../assets/img/asterisk.png";
      star.alt = "";
      letter.classList.add("is-star");
      letter.append(star);

      setTimeout(() => {
        star.remove();
        letter.classList.remove("is-star");
      }, STAYS);
    }, EVERY);
  });
}
