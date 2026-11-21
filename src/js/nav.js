// The menu button of the navbar (hamburger), shown on small screens only (see nav.css).
// It opens and closes the menu that covers the page.

(() => {
  const nav = document.querySelector(".nav");
  const button = nav && nav.querySelector(".nav__toggle");
  if (!button) return;

  const smallScreen = window.matchMedia("(max-width: 767px)");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("is-menu-open", open); // the page behind does not scroll
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
  }

  button.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

  // Escape closes the menu
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      button.focus();
    }
  });

  // On a big screen there is no menu button: the menu must not stay open
  smallScreen.addEventListener("change", () => {
    if (!smallScreen.matches) setOpen(false);
  });

  // Coming back with the browser's back button: the menu is closed
  window.addEventListener("pageshow", () => setOpen(false));
})();
