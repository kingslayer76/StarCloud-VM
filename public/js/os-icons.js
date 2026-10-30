// OS template icons. Templates store an emoji (e.g. "🟠") or an http(s) image URL.
// Emoji are rendered as an inline SVG so every existing <img> keeps working.
function osIconSrc(icon) {
  if (icon && /^https?:\/\//.test(icon)) return icon;
  const emoji = icon && String(icon).trim() ? String(icon).trim() : '💿';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<text x="32" y="48" font-size="46" text-anchor="middle" ' +
    'font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">' +
    emoji.replace(/[<>&]/g, '') + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
