import { createFileRoute } from "@tanstack/react-router";
import { GameScene } from "@/components/game/Scene";
import { HUD } from "@/components/game/HUD";
import { Menu, Results } from "@/components/game/Screens";
import { CameraControl } from "@/components/game/CameraControl";
import { useGame } from "@/game/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cyber Raid — 3D SOC Defense Game" },
      { name: "description", content: "Defend a futuristic security operations center from fictional cyberattacks with mouse or hand gestures." },
      { property: "og:title", content: "Cyber Raid — 3D SOC Defense Game" },
      { property: "og:description", content: "Investigate, isolate and firewall fictional cyberattacks in a 3D network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

function Game() {
  const phase = useGame((s) => s.phase);
  const mode = useGame((s) => s.mode);
  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <GameScene />
      <div className="scanlines pointer-events-none fixed inset-0 z-[5]" />
      {phase === "playing" && <HUD />}
      {phase === "playing" && mode === "camera" && <CameraControl />}
      {phase === "menu" && <Menu />}
      {phase === "results" && <Results />}
    </div>
  );
}
