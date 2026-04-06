import { Point } from "../models/play.model";

/**
 * @export
 * @param {Point} vertex
 * @param {Point} point2
 * @returns {Point[]}
 */
export function calculateTrajectory(vertex: Point, point2: Point): Point[] {
  let coords = [];
  let a = (point2.x - vertex.x) / Math.pow(point2.y - vertex.y, 2);

  for (let y = point2.y; y <= vertex.y; y++) {
    let x = a * Math.pow(y - vertex.y, 2) + vertex.x;
    coords.push({ x, y });
  }

  return coords.reverse().map((c) => ({
    x: c.x - vertex.x,
    y: c.y - vertex.y,
  }));
}

/**
 * @export
 * @param {DOMRect} r
 * @param {DOMRect} n
 * @param {{
 *     top: number;
 *     left: number;
 *     right: number;
 *     bottom: number;
 *   }} t
 * @returns {boolean}
 */
export function checkGoal(
  r: DOMRect,
  n: DOMRect,
  t: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  },
) {
  const intersectsNet =
    r.top >= n.top && r.left >= n.left && r.bottom <= n.bottom && r.right <= n.right;

  const intersectsGoalkie =
    r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top;

  return intersectsNet && !intersectsGoalkie;
}

/**
 * @export
 * @param {{x: number, y: number}} point
 * @param {DOMRect} rect
 * @returns {{ x: number; y: number; }}
 */
export function getContainerCoords(point: { x: number; y: number }, rect: DOMRect) {
  return {
    x: point.x - rect.left,
    y: point.y - rect.top,
  };
}

/**
 * @export
 * @param {{x: number, y: number}} point
 * @param {DOMRect} rect
 * @returns {{ x: any; y: any; }}
 */
export function getViewPortCoords(point: { x: number; y: number }, rect: DOMRect) {
  return {
    x: point.x + rect.left,
    y: point.y + rect.top,
  };
}

/**
 * @type {{}}
 */
export const lefthitboxes = [
  ...Array.from({ length: 9 }, () => ({ x: 100, y: 20, width: 65, height: 160 })),
  ...Array.from({ length: 6 }, () => ({
    x: 110,
    y: 30,
    width: 75,
    height: 150,
  })),
  ...Array.from({ length: 10 }, () => ({
    x: 40,
    y: 45,
    width: 145,
    height: 155,
  })),
  ...Array.from({ length: 21 }, () => ({ x: 20, y: 60, width: 180, height: 120 })),
];

/**
 * @type {{}}
 */
export const righthitboxes = [
  ...Array.from({ length: 9 }, () => ({
    x: 240 - (100 + 65),
    y: 20,
    width: 65,
    height: 160,
  })),

  ...Array.from({ length: 6 }, () => ({
    x: 240 - (110 + 75),
    y: 30,
    width: 75,
    height: 150,
  })),

  ...Array.from({ length: 10 }, () => ({
    x: 240 - (40 + 145),
    y: 45,
    width: 145,
    height: 155,
  })),

  ...Array.from({ length: 21 }, () => ({
    x: 240 - (20 + 180),
    y: 60,
    width: 180,
    height: 120,
  })),
];

/**
 * @type {{}}
 */
export const jumphitboxes = [
  ...Array.from({ length: 10 }, () => ({
    x: 80,
    y: 25,
    width: 60,
    height: 155,
  })),

  ...Array.from({ length: 8 }, () => ({
    x: 75,
    y: 38,
    width: 65,
    height: 140,
  })),

  ...Array.from({ length: 2 }, () => ({
    x: 70,
    y: 32,
    width: 65,
    height: 150,
  })),

  ...Array.from({ length: 14 }, () => ({
    x: 50,
    y: 0,
    width: 70,
    height: 185,
  })),

  ...Array.from({ length: 2 }, () => ({
    x: 75,
    y: 35,
    width: 80,
    height: 165,
  })),

  ...Array.from({ length: 3 }, () => ({
    x: 60,
    y: 20,
    width: 70,
    height: 150,
  })),

  ...Array.from({ length: 7 }, () => ({
    x: 80,
    y: 42,
    width: 54,
    height: 145,
  })),
];

/**
 *@param {number} power
 * @returns {*}
 */
export function calculateClampedTime(power: number) {
  const minPower = 0;
  const maxPower = 192;
  const minTime = 1;
  const maxTime = 4;

  const time = maxTime - ((power - minPower) * (maxTime - minTime)) / (maxPower - minPower);

  return Math.min(Math.max(time, minTime), maxTime);
}
