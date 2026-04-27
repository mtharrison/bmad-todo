const CANONICAL = {
  start: { x: 2.5, y: 7.5 },
  cp1: { x: 4, y: 9.5 },
  elbow: { x: 6, y: 11 },
  cp2: { x: 9, y: 7.5 },
  tip: { x: 12, y: 3.5 },
};

const JITTER_RANGE = 0.4;

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmt(n: number): string {
  return n.toFixed(3).replace(/\.?0+$/, "");
}

export function generateTickPath(seed: string): string {
  const rand = mulberry32(fnv1a(seed));
  const jitter = () => (rand() * 2 - 1) * JITTER_RANGE;
  const cp1x = CANONICAL.cp1.x + jitter();
  const cp1y = CANONICAL.cp1.y + jitter();
  const cp2x = CANONICAL.cp2.x + jitter();
  const cp2y = CANONICAL.cp2.y + jitter();
  return (
    `M ${fmt(CANONICAL.start.x)} ${fmt(CANONICAL.start.y)} ` +
    `Q ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(CANONICAL.elbow.x)} ${fmt(CANONICAL.elbow.y)} ` +
    `Q ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(CANONICAL.tip.x)} ${fmt(CANONICAL.tip.y)}`
  );
}
