(function () {
  var pref = 'system';
  try {
    var saved = window.localStorage.getItem('mixback:theme');
    if (saved === 'light' || saved === 'dark') pref = saved;
  } catch (e) {}
  var dark =
    pref === 'dark' ||
    (pref === 'system' &&
      !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches));
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
