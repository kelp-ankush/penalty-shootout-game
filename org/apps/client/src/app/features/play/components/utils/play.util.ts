import { IPoint } from "@org/shared-types";
import { IRect } from "../../../../core/interfaces/game.interface";


export function calculateTrajectory(vertex: IPoint, point: IPoint): IPoint[] {
  const coords: IPoint[] = [];
  const a: number = (point.x - vertex.x) / Math.pow(point.y - vertex.y, 2);

  for (let y = point.y; y <= vertex.y; y++) {
    const x = a * Math.pow(y - vertex.y, 2) + vertex.x;
    coords.push({ x, y });
  }

  return coords.reverse().map((c) => ({
    x: c.x - vertex.x,
    y: c.y - vertex.y,
  }));
}

export function checkGoal(
  r: DOMRect,
  n: DOMRect,
  t: IRect,
): boolean {
  const intersectsNet =
    r.top >= n.top && r.left >= n.left && r.bottom <= n.bottom && r.right <= n.right;

  const intersectsGoalkie =
    r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top;

  return intersectsNet && !intersectsGoalkie;
}

export function getContainerCoords(point: IPoint, rect: DOMRect): IPoint {
  return {
    x: point.x - rect.left,
    y: point.y - rect.top,
  };
}

export function getViewPortCoords(point: IPoint, rect: DOMRect): IPoint {
  return {
    x: point.x + rect.left,
    y: point.y + rect.top,
  };
}

export function calculateClampedTime(power: number): number {
  const minPower = 0;
  const maxPower = 192;
  const minTime = 1;
  const maxTime = 4;

  const time = maxTime - ((power - minPower) * (maxTime - minTime)) / (maxPower - minPower);

  return Math.min(Math.max(time, minTime), maxTime);
}
