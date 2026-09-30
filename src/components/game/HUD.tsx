import { useEffect } from "react";
import { NETWORK, THREATS, rankFor } from "@/game/data";
import { threatLevel, useGame } from "@/game/store";
import { cn } from "@/lib/utils";

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="w-40">
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-muted">
        <div className={cn("h-full transition-[width] duration-200", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function HUD() {
  const s = useGame();
  const tl = threatLevel(s.nodes);
  const mm = Math.floor(s.timeLeft / 60);
  const ss = String(Math.floor(s.timeLeft % 60)).padStart(2, "0");
  const sel = s.selected !== null ? s.nodes[s.selected] : null;
  const def = s.selected !== null ? NETWORK.nodes[s.selected] : null;

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const g = useGame.getState();
      if (e.key === "i" || e.key === "I" || e.key === "q") g.investigate();
      if (e.key === "x" || e.key === "X" || e.key === "e") g.isolate();
      if (e.key === "f" || e.key === "F" || e.key === " ") {
        e.preventDefault();
        g.firewall();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 font-mono">
      {/* top */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="panel pointer-events-auto flex gap-5 px-4 py-3">
          <Bar label="Integrity" value={s.integrity} tone="bg-neon-green" />
          <Bar label="Threat" value={tl} tone="bg-destructive" />
          <Bar label="Firewall" value={s.energy} tone={s.firewallFor > 0 ? "bg-neon-green animate-pulse" : "bg-primary"} />
        </div>
        <div className="panel px-5 py-2 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mission</div>
          <div className={cn("font-display text-3xl", s.timeLeft < 20 && "text-destructive animate-pulse")}>
            {mm}:{ss}
          </div>
        </div>
        <div className="panel px-4 py-2 text-right">
          <div className="font-display text-3xl text-primary">{s.score.toLocaleString()}</div>
          <div className="text-xs text-accent">x{s.combo} combo</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{rankFor(s.score)}</div>
        </div>
      </div>

      {/* bottom */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="panel w-80 px-3 py-2 text-xs">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Event log</div>
          {s.log.map((l) => (
            <div
              key={l.id}
              className={cn("animate-fade-in truncate", l.tone === "good" && "text-neon-green", l.tone === "bad" && "text-destructive")}
            >
              › {l.text}
            </div>
          ))}
          {s.lastTip && <div className="mt-2 border-t border-border pt-2 text-[11px] text-accent">INTEL: {s.lastTip}</div>}
        </div>

        <div className="panel pointer-events-auto w-80 px-4 py-3">
          {def && sel ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg">{def.label}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{def.kind}</span>
              </div>
              <div className="my-1 text-xs">
                Status:{" "}
                <span className={cn(sel.status === "infected" ? "text-destructive" : sel.status === "isolated" ? "text-muted-foreground" : "text-primary")}>
                  {sel.status.toUpperCase()}
                  {sel.status === "infected" && ` · ${Math.round(sel.infection * 100)}%`}
                </span>
              </div>
              {sel.status === "infected" && (
                <div className="text-xs text-muted-foreground">
                  Threat: {sel.investigated ? <span className="text-accent">{THREATS[sel.threat!].name} ({sel.threat})</span> : "Unknown — investigate"}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">
              {s.mode === "mouse" ? "Click a device to select it." : "Point at a device to select it."}
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="hud-btn" onClick={s.investigate}>Investigate<span>{s.mode === "mouse" ? "I" : "Pinch"}</span></button>
            <button className="hud-btn" onClick={s.isolate}>Isolate<span>{s.mode === "mouse" ? "X" : "Swipe"}</span></button>
            <button className="hud-btn" onClick={s.firewall}>Firewall<span>{s.mode === "mouse" ? "F" : "Palm"}</span></button>
          </div>
        </div>
        <div className="w-56" />
      </div>
    </div>
  );
}
