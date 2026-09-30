export type NodeKind = "server" | "computer" | "router";
export type ThreatType = "malware" | "phishing" | "exfiltration" | "ransomware" | "botnet";

export interface NetNode {
  id: number;
  kind: NodeKind;
  label: string;
  pos: [number, number, number];
}

export interface ThreatInfo {
  name: string;
  color: string;
  growth: number; // infection per second
  tip: string;
}

// All scenarios are fictional and simplified for education.
export const THREATS: Record<ThreatType, ThreatInfo> = {
  malware: {
    name: "Worm.Glitchbyte",
    color: "#ff3b6b",
    growth: 0.1,
    tip: "Malware is harmful software. Keep systems patched and isolate infected hosts quickly to stop lateral spread.",
  },
  phishing: {
    name: "Lure.FakeInvoice",
    color: "#ffb020",
    growth: 0.07,
    tip: "Phishing tricks people into clicking links or sharing passwords. Check the sender, hover links, and report suspicious mail.",
  },
  exfiltration: {
    name: "Leak.NightOwl",
    color: "#b86bff",
    growth: 0.09,
    tip: "Data exfiltration is unauthorized data leaving the network. Watch for unusual outbound traffic at odd hours.",
  },
  ransomware: {
    name: "Lock.CryptoMoth",
    color: "#ff5a1f",
    growth: 0.13,
    tip: "Ransomware encrypts files and demands payment. Offline backups and fast containment are the best defense.",
  },
  botnet: {
    name: "Swarm.Hivemind",
    color: "#3bffb4",
    growth: 0.08,
    tip: "Botnets hijack many devices at once. Change default passwords and monitor devices that call unknown servers.",
  },
};

export const THREAT_TYPES = Object.keys(THREATS) as ThreatType[];

function buildNetwork() {
  const nodes: NetNode[] = [];
  const links: [number, number][] = [];
  // central core routers
  const routers: [number, number][] = [
    [0, 0],
    [-7, -4],
    [7, -4],
    [0, 7],
  ];
  routers.forEach(([x, z], i) => nodes.push({ id: nodes.length, kind: "router", label: `RTR-0${i + 1}`, pos: [x, 0, z] }));
  links.push([0, 1], [0, 2], [0, 3], [1, 2]);
  let srv = 1;
  let ws = 1;
  routers.forEach(([rx, rz], ri) => {
    const count = 3;
    for (let k = 0; k < count; k++) {
      const a = (ri * 1.7 + k * ((Math.PI * 2) / count)) % (Math.PI * 2);
      const r = 3.2;
      const isServer = k === 0;
      const id = nodes.length;
      nodes.push({
        id,
        kind: isServer ? "server" : "computer",
        label: isServer ? `SRV-${String(srv++).padStart(2, "0")}` : `WS-${String(ws++).padStart(2, "0")}`,
        pos: [rx + Math.cos(a) * r, 0, rz + Math.sin(a) * r],
      });
      links.push([ri, id]);
    }
  });
  // a few cross links
  links.push([4, 7], [10, 13], [5, 14]);
  const neighbors: number[][] = nodes.map(() => []);
  links.forEach(([a, b]) => {
    neighbors[a].push(b);
    neighbors[b].push(a);
  });
  return { nodes, links, neighbors };
}

export const NETWORK = buildNetwork();

export const RANKS = [
  { min: 0, name: "Trainee Analyst" },
  { min: 1500, name: "SOC Analyst I" },
  { min: 3500, name: "SOC Analyst II" },
  { min: 6000, name: "Threat Hunter" },
  { min: 9000, name: "Incident Commander" },
  { min: 13000, name: "Cyber Sentinel" },
];

export function rankFor(score: number) {
  let r = RANKS[0].name;
  for (const k of RANKS) if (score >= k.min) r = k.name;
  return r;
}

export const MISSION_SECONDS = 150;
