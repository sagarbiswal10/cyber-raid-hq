import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/store";
import { nearestNode } from "@/game/screen";

type Gesture = "none" | "point" | "pinch" | "palm" | "swipe";
type P = { x: number; y: number; z: number };

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

function classify(lm: P[]): Gesture {
  const wrist = lm[0];
  const palmSize = dist(wrist, lm[9]) || 0.1;
  const ext = (tip: number, pip: number) => dist(lm[tip], wrist) > dist(lm[pip], wrist) * 1.15;
  const idx = ext(8, 6);
  const mid = ext(12, 10);
  const ring = ext(16, 14);
  const pinky = ext(20, 18);
  if (dist(lm[4], lm[8]) / palmSize < 0.28) return "pinch";
  if (idx && mid && ring && pinky) return "palm";
  if (idx && !mid && !ring) return "point";
  return "none";
}

export function CameraControl() {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Starting camera…");
  const [gesture, setGesture] = useState<Gesture>("none");
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    const cooldown = { pinch: 0, palm: 0, swipe: 0 };
    const hist: { x: number; t: number }[] = [];
    let smooth = { x: 0.5, y: 0.5 };
    let lastG: Gesture = "none";

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (stop || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setStatus("Loading hand tracking…");
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const fs = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
        const lmk = await HandLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (stop) return;
        setStatus("Show your hand");
        const loop = () => {
          if (stop || !video.current) return;
          const now = performance.now();
          const res = lmk.detectForVideo(video.current, now);
          const lm = res.landmarks?.[0] as P[] | undefined;
          const g = useGame.getState();
          if (lm) {
            setStatus("Tracking");
            const tip = lm[8];
            const x = 1 - tip.x; // mirror
            smooth = { x: smooth.x + (x - smooth.x) * 0.4, y: smooth.y + (tip.y - smooth.y) * 0.4 };
            setCursor({ ...smooth });
            // swipe: fast horizontal wrist motion
            hist.push({ x: 1 - lm[0].x, t: now });
            while (hist.length && now - hist[0].t > 250) hist.shift();
            let gest = classify(lm);
            if (hist.length > 3 && Math.abs(hist[hist.length - 1].x - hist[0].x) > 0.28) gest = "swipe";
            if (gest === "point") {
              const id = nearestNode(smooth.x, smooth.y, 0.09);
              if (id !== null) g.select(id);
            } else if (gest === "pinch" && lastG !== "pinch" && now > cooldown.pinch) {
              g.investigate();
              cooldown.pinch = now + 600;
            } else if (gest === "swipe" && now > cooldown.swipe) {
              g.isolate();
              cooldown.swipe = now + 900;
              hist.length = 0;
            } else if (gest === "palm" && now > cooldown.palm) {
              const held = lastG === "palm";
              if (held) {
                g.firewall();
                cooldown.palm = now + 2000;
              }
            }
            lastG = gest;
            setGesture(gest);
          } else {
            setCursor(null);
            setGesture("none");
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error(e);
        setStatus("Camera unavailable — switch to Mouse Mode");
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <>
      {cursor && (
        <div
          className="pointer-events-none fixed z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neon-yellow shadow-neon"
          style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        >
          <div className="absolute inset-2 rounded-full bg-neon-yellow/60" />
        </div>
      )}
      <div className="pointer-events-auto fixed bottom-4 right-4 z-20 w-56 overflow-hidden rounded-md border border-primary/40 bg-panel backdrop-blur">
        <video ref={video} className="aspect-[4/3] w-full -scale-x-100 object-cover opacity-80" muted playsInline />
        <div className="flex items-center justify-between px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
          <span className="text-muted-foreground">{status}</span>
          <span className="text-primary">{gesture}</span>
        </div>
      </div>
    </>
  );
}
