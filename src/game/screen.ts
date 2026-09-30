// Screen-space positions of nodes (0..1 normalized), updated each frame by the scene.
export const nodeScreen: { x: number; y: number }[] = [];

export function nearestNode(nx: number, ny: number, maxDist = 0.08) {
  let best = -1;
  let bd = maxDist;
  nodeScreen.forEach((p, i) => {
    const d = Math.hypot(p.x - nx, p.y - ny);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best >= 0 ? best : null;
}
