const WINDOW_SIZE = 100;

let active = false;
const keystrokeSamples: number[] = [];
const completionSamples: number[] = [];
let keystrokeStart = -1;
let completionStart = -1;

function pushSample(samples: number[], value: number): void {
  samples.push(value);
  if (samples.length > WINDOW_SIZE) samples.shift();
}

function calcP95(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)]!;
}

export const latencyTracker = {
  recordKeystrokeStart(): void {
    if (!active) return;
    keystrokeStart = performance.now();
  },

  recordKeystrokeEnd(): void {
    if (!active || keystrokeStart < 0) return;
    pushSample(keystrokeSamples, performance.now() - keystrokeStart);
    keystrokeStart = -1;
  },

  recordCompletionStart(): void {
    if (!active) return;
    completionStart = performance.now();
  },

  recordCompletionEnd(): void {
    if (!active || completionStart < 0) return;
    pushSample(completionSamples, performance.now() - completionStart);
    completionStart = -1;
  },

  getKeystrokeP95(): number {
    return calcP95(keystrokeSamples);
  },

  getCompletionP95(): number {
    return calcP95(completionSamples);
  },

  isActive(): boolean {
    return active;
  },

  setActive(v: boolean): void {
    active = v;
  },

  _reset(): void {
    active = false;
    keystrokeSamples.length = 0;
    completionSamples.length = 0;
    keystrokeStart = -1;
    completionStart = -1;
  },
};
