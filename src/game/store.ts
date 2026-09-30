import { create } from "zustand";
import { MISSION_SECONDS, NETWORK, THREATS, THREAT_TYPES, type ThreatType } from "./data";
import { sfx } from "./audio";

export type NodeStatus = "clean" | "infected" | "isolated";
export interface NodeState {
  status: NodeStatus;
  infection: number;
  threat: ThreatType | null;
  investigated: boolean;
  isolatedFor: number;
}
export type Phase = "menu" | "playing" | "results";
export type InputMode = "mouse" | "camera";

export interface LogEntry {
  id: number;
  text: string;
  tone: "info" | "good" | "bad";
}

export interface LeaderEntry {
  name: string;
  score: number;
  rank: string;
  date: string;
}

interface GameState {
  phase: Phase;
  mode: InputMode;
  playerName: string;
  nodes: NodeState[];
  selected: number | null;
  timeLeft: number;
  integrity: number;
  energy: number;
  firewallFor: number;
  score: number;
  combo: number;
  maxCombo: number;
  contained: number;
  breaches: number;
  spawnIn: number;
  log: LogEntry[];
  lastTip: string | null;
  endReason: string;
  setMode: (m: InputMode) => void;
  setName: (n: string) => void;
  start: () => void;
  toMenu: () => void;
  select: (id: number | null) => void;
  investigate: () => void;
  isolate: () => void;
  firewall: () => void;
  tick: (dt: number) => void;
}

const fresh = (): NodeState[] =>
  NETWORK.nodes.map(() => ({ status: "clean", infection: 0, threat: null, investigated: false, isolatedFor: 0 }));

let logId = 0;
const push = (log: LogEntry[], text: string, tone: LogEntry["tone"]) =>
  [{ id: ++logId, text, tone }, ...log].slice(0, 6);

export const LB_KEY = "cyber-raid-leaderboard";
export function loadLeaderboard(): LeaderEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LB_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveScore(e: LeaderEntry) {
  const lb = [...loadLeaderboard(), e].sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem(LB_KEY, JSON.stringify(lb));
  return lb;
}

function infect(nodes: NodeState[], id: number, threat: ThreatType) {
  const n = nodes[id];
  if (n.status !== "clean") return false;
  nodes[id] = { status: "infected", infection: 0.05, threat, investigated: false, isolatedFor: 0 };
  return true;
}

export const useGame = create<GameState>((set, get) => ({
  phase: "menu",
  mode: "mouse",
  playerName: "",
  nodes: fresh(),
  selected: null,
  timeLeft: MISSION_SECONDS,
  integrity: 100,
  energy: 100,
  firewallFor: 0,
  score: 0,
  combo: 1,
  maxCombo: 1,
  contained: 0,
  breaches: 0,
  spawnIn: 2,
  log: [],
  lastTip: null,
  endReason: "",
  setMode: (mode) => set({ mode }),
  setName: (playerName) => set({ playerName }),
  start: () => {
    sfx.start();
    set({
      phase: "playing",
      nodes: fresh(),
      selected: null,
      timeLeft: MISSION_SECONDS,
      integrity: 100,
      energy: 100,
      firewallFor: 0,
      score: 0,
      combo: 1,
      maxCombo: 1,
      contained: 0,
      breaches: 0,
      spawnIn: 2,
      log: [{ id: ++logId, text: "Mission started. Monitor the network.", tone: "info" }],
      lastTip: null,
    });
  },
  toMenu: () => set({ phase: "menu" }),
  select: (id) => {
    if (get().phase !== "playing") return;
    if (id !== get().selected && id !== null) sfx.select();
    set({ selected: id });
  },
  investigate: () => {
    const s = get();
    if (s.phase !== "playing" || s.selected === null) return;
    const n = s.nodes[s.selected];
    const label = NETWORK.nodes[s.selected].label;
    if (n.status !== "infected") {
      sfx.error();
      set({ log: push(s.log, `${label}: scan clean. No threat found.`, "info") });
      return;
    }
    if (n.investigated) return;
    sfx.investigate();
    const nodes = [...s.nodes];
    nodes[s.selected] = { ...n, investigated: true, infection: Math.max(0.05, n.infection - 0.15) };
    const t = THREATS[n.threat!];
    set({
      nodes,
      score: s.score + 50 * s.combo,
      lastTip: t.tip,
      log: push(s.log, `${label}: identified ${t.name}.`, "info"),
    });
  },
  isolate: () => {
    const s = get();
    if (s.phase !== "playing" || s.selected === null) return;
    const n = s.nodes[s.selected];
    const label = NETWORK.nodes[s.selected].label;
    if (n.status !== "infected") {
      sfx.error();
      set({ combo: 1, score: Math.max(0, s.score - 50), log: push(s.log, `${label}: isolated a healthy host. -50`, "bad") });
      return;
    }
    sfx.isolate();
    const nodes = [...s.nodes];
    nodes[s.selected] = { status: "isolated", infection: 0, threat: null, investigated: false, isolatedFor: 4 };
    if (n.investigated) {
      const gain = Math.round((200 + (1 - n.infection) * 200) * s.combo);
      const combo = Math.min(8, s.combo + 1);
      set({
        nodes,
        score: s.score + gain,
        combo,
        maxCombo: Math.max(s.maxCombo, combo),
        contained: s.contained + 1,
        energy: Math.min(100, s.energy + 8),
        log: push(s.log, `${label}: threat contained. +${gain}`, "good"),
      });
    } else {
      set({
        nodes,
        score: s.score + 75,
        combo: 1,
        contained: s.contained + 1,
        log: push(s.log, `${label}: isolated without analysis. Combo lost.`, "bad"),
      });
    }
  },
  firewall: () => {
    const s = get();
    if (s.phase !== "playing" || s.firewallFor > 0) return;
    if (s.energy < 40) {
      sfx.error();
      set({ log: push(s.log, "Firewall needs 40% energy.", "bad") });
      return;
    }
    sfx.firewall();
    set({ energy: s.energy - 40, firewallFor: 6, log: push(s.log, "Firewall activated. Spread slowed.", "good") });
  },
  tick: (dt) => {
    const s = get();
    if (s.phase !== "playing") return;
    const nodes = [...s.nodes];
    let { integrity, log, breaches, spawnIn, combo } = s;
    const elapsed = 150 - s.timeLeft;
    const difficulty = 1 + elapsed / 90;
    const fw = s.firewallFor > 0 ? 0.2 : 1;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.status === "isolated") {
        const left = n.isolatedFor - dt;
        nodes[i] = left <= 0 ? { ...n, status: "clean", isolatedFor: 0 } : { ...n, isolatedFor: left };
      } else if (n.status === "infected" && n.threat) {
        const inf = n.infection + THREATS[n.threat].growth * difficulty * fw * dt * (n.investigated ? 0.6 : 1);
        integrity -= inf * 0.35 * dt * fw;
        if (inf >= 1) {
          // spread
          breaches++;
          combo = 1;
          integrity -= 6;
          sfx.breach();
          nodes[i] = { ...n, infection: 0.55 };
          const nb = NETWORK.neighbors[i].filter((j) => nodes[j].status === "clean");
          const spreadTo = nb.sort(() => Math.random() - 0.5).slice(0, 2);
          spreadTo.forEach((j) => infect(nodes, j, n.threat!));
          log = push(log, `${NETWORK.nodes[i].label}: BREACH! ${THREATS[n.threat].name} spreading.`, "bad");
        } else nodes[i] = { ...n, infection: inf };
      }
    }

    spawnIn -= dt * fw;
    if (spawnIn <= 0) {
      const clean = nodes.map((n, i) => (n.status === "clean" ? i : -1)).filter((i) => i >= 0);
      if (clean.length) {
        const id = clean[Math.floor(Math.random() * clean.length)];
        const t = THREAT_TYPES[Math.floor(Math.random() * THREAT_TYPES.length)];
        infect(nodes, id, t);
        sfx.alert();
        log = push(log, `Alert: suspicious activity on ${NETWORK.nodes[id].label}.`, "info");
      }
      spawnIn = Math.max(1.4, 4.2 - elapsed / 45) + Math.random();
    }

    const timeLeft = s.timeLeft - dt;
    integrity = Math.max(0, integrity);
    const patch: Partial<GameState> = {
      nodes,
      integrity,
      log,
      breaches,
      spawnIn,
      combo,
      timeLeft: Math.max(0, timeLeft),
      firewallFor: Math.max(0, s.firewallFor - dt),
      energy: Math.min(100, s.energy + dt * 2.2),
    };
    if (timeLeft <= 0 || integrity <= 0) {
      sfx.end();
      const bonus = integrity > 0 ? Math.round(integrity * 20) : 0;
      patch.phase = "results";
      patch.score = s.score + bonus;
      patch.endReason = integrity > 0 ? `Mission complete. Integrity bonus +${bonus}` : "Network compromised. Mission failed.";
    }
    set(patch);
  },
}));

export function threatLevel(nodes: NodeState[]) {
  const sum = nodes.reduce((a, n) => a + (n.status === "infected" ? 0.4 + n.infection : 0), 0);
  return Math.min(100, Math.round((sum / 6) * 100));
}
