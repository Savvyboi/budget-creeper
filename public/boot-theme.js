/**
 * Applies the stored theme and language before first paint, so a reader who
 * chose dark does not get a white flash on every load.
 *
 * This lives in its own file rather than inline in index.html because the site
 * ships a Content-Security-Policy with `script-src 'self'`, which blocks inline
 * scripts. Keep it small: it is render-blocking by design.
 */
(function () {
  try {
    var theme = localStorage.getItem('vb:theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    var lang = localStorage.getItem('vb:lang');
    if (lang === 'fi' || lang === 'sv' || lang === 'en') document.documentElement.lang = lang;
  } catch (e) {
    /* private windows and blocked site data both throw; the defaults are fine */
  }
})();
