export interface DiagramPoint { x: number; y: number }
export interface DiagramRect { x: number; y: number; width: number; height: number }

function overlaps(a: DiagramRect, b: DiagramRect, padding = 7) {
  return a.x < b.x + b.width + padding && a.x + a.width + padding > b.x
    && a.y < b.y + b.height + padding && a.y + a.height + padding > b.y;
}

/** Place a stream label near its route without covering equipment, boundary ports, or another label. */
export function placeDiagramLabel(
  anchor: DiagramPoint,
  blocked: readonly DiagramRect[],
  occupied: readonly DiagramRect[],
  size: { width: number; height: number },
  bounds = { left: 230, top: 58, right: 1250, bottom: 730 },
): DiagramPoint {
  const offsets: DiagramPoint[] = [{ x: 0, y: 0 }];
  for (let radius = 20; radius <= 520; radius += 20) {
    for (let y = -radius; y <= radius; y += 20) {
      for (let x = -radius; x <= radius; x += 20) {
        if (Math.max(Math.abs(x), Math.abs(y)) === radius) offsets.push({ x, y });
      }
    }
  }
  offsets.sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y) || Math.abs(a.y) - Math.abs(b.y));
  for (const offset of offsets) {
    const point = { x: anchor.x + offset.x, y: anchor.y + offset.y };
    const rect = { x: point.x - size.width / 2, y: point.y - size.height / 2, ...size };
    if (rect.x < bounds.left || rect.x + rect.width > bounds.right || rect.y < bounds.top || rect.y + rect.height > bounds.bottom) continue;
    if (blocked.some((other) => overlaps(rect, other)) || occupied.some((other) => overlaps(rect, other))) continue;
    return point;
  }
  return { x: Math.min(bounds.right - size.width / 2, Math.max(bounds.left + size.width / 2, anchor.x)), y: Math.min(bounds.bottom - size.height / 2, Math.max(bounds.top + size.height / 2, anchor.y)) };
}

export function labelRect(center: DiagramPoint, size: { width: number; height: number }): DiagramRect {
  return { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size };
}
