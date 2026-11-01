// OS template icons. Templates store a logo path (/images/os/...), an http(s) image URL, or an emoji.
// Emoji are rendered as an inline SVG so every existing <img> keeps working.
function osIconSrc(icon) {
  // Built-in templates use the official logos in /images/os/; custom templates may use any http(s) URL.
  if (icon && (/^https?:\/\//.test(icon) || /^\/images\//.test(icon))) return icon;
  const emoji = icon && String(icon).trim() ? String(icon).trim() : '💿';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<text x="32" y="48" font-size="46" text-anchor="middle" ' +
    'font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">' +
    emoji.replace(/[<>&]/g, '') + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Built-in OS logos are official brand marks (some are dark). Give them a light tile so they stay visible on the dark theme.
(function () {
  if (typeof document === 'undefined' || document.getElementById('os-icon-style')) return;
  var st = document.createElement('style');
  st.id = 'os-icon-style';
  st.textContent = 'img[src^="/images/os/"]{background:#fff;border-radius:8px;padding:4px;box-sizing:border-box;object-fit:contain;}';
  document.head.appendChild(st);
})();
