import { describe, expect, it } from 'vitest';
import { labelRect, placeDiagramLabel, type DiagramRect } from './diagram-layout';

describe('schematic label placement', () => {
  it('moves stream annotations clear of equipment cards and keeps them inside the schematic sheet', () => {
    const nodes: DiagramRect[] = [
      { x: 388, y: 312, width: 164, height: 206 },
      { x: 728, y: 192, width: 164, height: 206 },
      { x: 728, y: 472, width: 164, height: 206 },
    ];
    const first = placeDiagramLabel({ x: 810, y: 400 }, nodes, [], { width: 156, height: 40 });
    expect(nodes.some((node) => labelRect(first, { width: 156, height: 40 }).x < node.x + node.width && labelRect(first, { width: 156, height: 40 }).x + 156 > node.x && labelRect(first, { width: 156, height: 40 }).y < node.y + node.height && labelRect(first, { width: 156, height: 40 }).y + 40 > node.y)).toBe(false);
    expect(first.x).toBeGreaterThanOrEqual(308);
    expect(first.x).toBeLessThanOrEqual(1172);
    const second = placeDiagramLabel({ x: 810, y: 400 }, nodes, [labelRect(first, { width: 156, height: 40 })], { width: 156, height: 40 });
    expect(labelRect(second, { width: 156, height: 40 })).not.toEqual(labelRect(first, { width: 156, height: 40 }));
  });

  it('preserves unshifted labels when there is clear route space', () => {
    expect(placeDiagramLabel({ x: 640, y: 320 }, [], [], { width: 156, height: 40 })).toEqual({ x: 640, y: 320 });
  });

  it('places dense multi-stage area labels clear of node cards and each other', () => {
    const nodes: DiagramRect[] = [
      { x: 292, y: 148, width: 164, height: 206 },
      { x: 530, y: 148, width: 164, height: 206 },
      { x: 768, y: 148, width: 164, height: 206 },
      { x: 1006, y: 148, width: 164, height: 206 },
      { x: 292, y: 430, width: 164, height: 206 },
      { x: 530, y: 430, width: 164, height: 206 },
      { x: 768, y: 430, width: 164, height: 206 },
      { x: 1006, y: 430, width: 164, height: 206 },
    ];
    const anchors = [
      { x: 470, y: 205 }, { x: 625, y: 215 }, { x: 860, y: 195 }, { x: 1050, y: 230 },
      { x: 460, y: 370 }, { x: 645, y: 385 }, { x: 890, y: 380 }, { x: 1030, y: 390 },
      { x: 480, y: 490 }, { x: 640, y: 505 }, { x: 870, y: 490 }, { x: 1030, y: 515 },
    ];
    const size = { width: 156, height: 40 };
    const placed: DiagramRect[] = [];
    for (const anchor of anchors) {
      const point = placeDiagramLabel(anchor, nodes, placed, size, { left: 80, top: 75, right: 1400, bottom: 700 });
      const box = labelRect(point, size);
      expect(nodes.some((node) => intersects(box, node))).toBe(false);
      expect(placed.some((other) => intersects(box, other))).toBe(false);
      placed.push(box);
    }
  });
});

function intersects(a: DiagramRect, b: DiagramRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
