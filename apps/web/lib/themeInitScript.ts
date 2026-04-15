/** Inline script for <head>: runs before paint to avoid theme flash. */
export const themeInitScript = `
(function () {
  try {
    var key = "tres-finos-theme";
    var root = document.documentElement;
    var stored = localStorage.getItem(key);
    if (stored === "light" || stored === "dark") {
      root.setAttribute("data-theme", stored);
      return;
    }
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    root.setAttribute("data-theme", prefersLight ? "light" : "dark");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;
