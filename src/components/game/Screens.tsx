import { useEffect, useState } from "react";
import { RANKS, rankFor } from "@/game/data";
import { loadLeaderboard, saveScore, useGame, type LeaderEntry } from "@/game/store";
import { setMuted } from "@/game/audio";
import { cn } from "@/lib/utils";

function Leaderboard({ entries, highlight }: { entries: LeaderEntry[]; highlight?: number | undefined }) {
  return (
    <div className="panel p-4">
      <div className="mb-2 font-display text-sm uppercase tracking-widest text-primary">Leaderboard</div>
      {entries.length === 0 && <div className="text-xs text-muted-foreground">No missions logged yet.</div>}
      <ol className="space-y-1 font-mono text-xs">
        {entries.map((e, i) => (
          <li key={i} className={cn("flex justify-between gap-3", i === highlight && "text-neon-yellow")}>
            <span>
              {String(i + 1).padStart(2, "0")}. {e.name}
            </span>
            <span className="text-muted-foreground">{e.rank}</span>
            <span>{e.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Menu() {
  const { mode, setMode, playerName, setName, start } = useGame();
  const [lb, setLb] = useState<LeaderEntry[]>([]);
  const [mute, setMute] = useState(false);
  useEffect(() => setLb(loadLeaderboard()), []);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-auto bg-background/70 p-6 backdrop-blur-sm">
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="panel animate-scale-in p-8">
          <div className="font-mono text-xs uppercase tracking-[0.4em] text-accent">SOC // Training Simulation</div>
          <h1 className="glitch mt-2 font-display text-6xl font-black tracking-tight text-primary">CYBER RAID</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            You are the analyst on shift. Fictional attacks hit the network — find them, identify them, and contain them before they spread.
          </p>
          <label className="mt-6 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Callsign</label>
          <input
            value={playerName}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="ANALYST"
            className="mt-1 w-full rounded-sm border border-primary/40 bg-input/40 px-3 py-2 font-mono uppercase outline-none focus:border-primary"
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(["mouse", "camera"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-sm border px-3 py-3 text-left transition",
                  mode === m ? "border-primary bg-primary/15 shadow-neon" : "border-border hover:border-primary/50",
                )}
              >
                <div className="font-display text-sm uppercase">{m} mode</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {m === "mouse" ? "Click · I · X · F" : "Hand gestures via webcam"}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground sm:grid-cols-4">
            <div><span className="text-primary">Point</span> select</div>
            <div><span className="text-primary">Pinch</span> investigate</div>
            <div><span className="text-primary">Swipe</span> isolate</div>
            <div><span className="text-primary">Palm</span> firewall</div>
          </div>
          <div className="mt-7 flex items-center gap-4">
            <button onClick={start} className="rounded-sm bg-primary px-8 py-3 font-display font-bold uppercase tracking-widest text-primary-foreground shadow-neon transition hover:scale-105">
              Start mission
            </button>
            <button
              className="font-mono text-xs text-muted-foreground underline"
              onClick={() => {
                setMute(!mute);
                setMuted(!mute);
              }}
            >
              Sound: {mute ? "off" : "on"}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel p-4 font-mono text-xs text-muted-foreground">
            <div className="mb-2 font-display text-sm uppercase tracking-widest text-primary">Protocol</div>
            <p>1. Select a flashing device.</p>
            <p>2. Investigate to identify the threat (keeps combo).</p>
            <p>3. Isolate to contain it. Skipping analysis resets your combo.</p>
            <p>4. Firewall slows every attack for 6s (40% energy).</p>
          </div>
          <Leaderboard entries={lb} />
        </div>
      </div>
    </div>
  );
}

export function Results() {
  const s = useGame();
  const [lb, setLb] = useState<LeaderEntry[]>([]);
  const [idx, setIdx] = useState<number | undefined>();
  useEffect(() => {
    const name = (s.playerName.trim() || "ANALYST").toUpperCase();
    const entry = { name, score: s.score, rank: rankFor(s.score), date: new Date().toISOString() };
    const list = saveScore(entry);
    setLb(list);
    const i = list.findIndex((e) => e.date === entry.date);
    setIdx(i >= 0 ? i : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rank = rankFor(s.score);
  const next = RANKS.find((r) => r.min > s.score);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-auto bg-background/80 p-6 backdrop-blur">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div className="panel animate-scale-in p-8">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Mission report</div>
          <div className={cn("mt-2 font-display text-2xl", s.integrity > 0 ? "text-neon-green" : "text-destructive")}>{s.endReason}</div>
          <div className="mt-6 font-display text-6xl text-primary">{s.score.toLocaleString()}</div>
          <div className="mt-1 font-display text-xl uppercase">{rank}</div>
          {next && <div className="font-mono text-xs text-muted-foreground">{(next.min - s.score).toLocaleString()} pts to {next.name}</div>}
          <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-sm">
            <Stat k="Contained" v={s.contained} />
            <Stat k="Breaches" v={s.breaches} />
            <Stat k="Max combo" v={`x${s.maxCombo}`} />
            <Stat k="Integrity" v={`${Math.round(s.integrity)}%`} />
          </div>
          <div className="mt-7 flex gap-3">
            <button onClick={s.start} className="rounded-sm bg-primary px-6 py-3 font-display font-bold uppercase tracking-widest text-primary-foreground shadow-neon">
              Redeploy
            </button>
            <button onClick={s.toMenu} className="rounded-sm border border-border px-6 py-3 font-display uppercase tracking-widest">
              Menu
            </button>
          </div>
        </div>
        <Leaderboard entries={lb} highlight={idx} />
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="rounded-sm border border-border p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="text-xl">{v}</div>
    </div>
  );
}
