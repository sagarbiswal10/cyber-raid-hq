let ctx: AudioContext | null = null;
let muted = false;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, slide = 0) {
  const c = ac();
  if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export const sfx = {
  select: () => tone(880, 0.08, "square", 0.05),
  investigate: () => {
    tone(520, 0.12, "triangle", 0.1);
    setTimeout(() => tone(780, 0.14, "triangle", 0.1), 90);
  },
  isolate: () => {
    tone(300, 0.25, "sawtooth", 0.08, 600);
    setTimeout(() => tone(1200, 0.2, "sine", 0.08), 150);
  },
  firewall: () => tone(120, 0.8, "sawtooth", 0.12, 400),
  alert: () => tone(440, 0.3, "square", 0.06, -200),
  breach: () => tone(90, 0.5, "sawtooth", 0.15, -40),
  error: () => tone(160, 0.2, "square", 0.08),
  start: () => [440, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.15, "triangle", 0.1), i * 110)),
  end: () => [880, 660, 440, 330].forEach((f, i) => setTimeout(() => tone(f, 0.2, "triangle", 0.1), i * 140)),
};
