const { desktopCapturer, screen } = require('electron');

async function captureScreenshot() {
  const target = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { width, height } = target.size;
  const scale = target.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.floor(width * scale),
      height: Math.floor(height * scale)
    }
  });
  if (!sources.length) return null;
  const source = sources.find((item) => String(item.display_id) === String(target.id)) || sources[0];
  if (!source.thumbnail || source.thumbnail.isEmpty()) return null;
  return source.thumbnail.toDataURL();
}

module.exports = { captureScreenshot };
