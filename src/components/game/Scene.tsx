import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, Lightformer, Line, OrbitControls, Text } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { NETWORK, THREATS } from "@/game/data";
import { useGame, type NodeState } from "@/game/store";
import { nodeScreen } from "@/game/screen";

const CLEAN = "#22e1ff";
const ISO = "#5a6a85";
const SEL = "#f5ff4a";

function colorFor(n: NodeState) {
  if (n.status === "isolated") return ISO;
  if (n.status === "infected" && n.threat) return THREATS[n.threat].color;
  return CLEAN;
}

function Loop() {
  const tick = useGame((s) => s.tick);
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, raw) => {
    tick(Math.min(raw, 0.05));
    NETWORK.nodes.forEach((n, i) => {
      v.set(n.pos[0], 1, n.pos[2]).project(camera);
      nodeScreen[i] = { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
    });
    void size;
  });
  return null;
}

function NodeModel({ kind, color, emissive }: { kind: string; color: string; emissive: number }) {
  const mat = (
    <meshStandardMaterial color="#141b2e" metalness={0.7} roughness={0.35} emissive={color} emissiveIntensity={emissive * 0.25} />
  );
  const glow = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6 * emissive + 0.4} toneMapped={false} />;
  if (kind === "server")
    return (
      <group>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[1, 2.2, 1]} />
          {mat}
        </mesh>
        {[0.4, 0.8, 1.2, 1.6, 2.0].map((y) => (
          <mesh key={y} position={[0, y, 0.51]}>
            <boxGeometry args={[0.8, 0.06, 0.02]} />
            {glow}
          </mesh>
        ))}
      </group>
    );
  if (kind === "router")
    return (
      <group>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.9, 1, 0.7, 8]} />
          {mat}
        </mesh>
        <mesh position={[0, 0.72, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          {glow}
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 1.1, -0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8]} />
            {glow}
          </mesh>
        ))}
      </group>
    );
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        {mat}
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[1.3, 0.85, 0.08]} />
        {mat}
      </mesh>
      <mesh position={[0, 1.3, 0.05]}>
        <planeGeometry args={[1.15, 0.7]} />
        {glow}
      </mesh>
    </group>
  );
}

function NetNodeView({ i }: { i: number }) {
  const def = NETWORK.nodes[i];
  const n = useGame((s) => s.nodes[i]);
  const selected = useGame((s) => s.selected === i);
  const select = useGame((s) => s.select);
  const mode = useGame((s) => s.mode);
  const g = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const color = colorFor(n);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      const shake = n.status === "infected" ? Math.sin(t * 40) * 0.02 * n.infection : 0;
      g.current.position.x = def.pos[0] + shake;
    }
    if (ring.current) {
      const s = 1.6 + (n.status === "infected" ? n.infection * 1.2 + Math.sin(t * 6) * 0.1 : 0);
      ring.current.scale.setScalar(s);
      ring.current.rotation.z = t * 0.8;
    }
  });
  return (
    <group
      ref={g}
      position={def.pos}
      onClick={(e) => {
        if (mode !== "mouse") return;
        e.stopPropagation();
        select(i);
      }}
      onPointerOver={() => mode === "mouse" && (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <NodeModel kind={def.kind} color={color} emissive={n.status === "infected" ? 0.6 + n.infection : 0.5} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.8, 0.88, 6]} />
        <meshBasicMaterial color={selected ? SEL : color} transparent opacity={selected ? 1 : 0.6} toneMapped={false} />
      </mesh>
      {n.status === "infected" && (
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[1.4 * n.infection, 0.12, 0.12]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
      <Text position={[0, 2.6, 0]} fontSize={0.32} color={selected ? SEL : "#b8c7e6"} anchorX="center">
        {def.label}
        {n.status === "infected" && n.investigated ? `\n${THREATS[n.threat!].name}` : ""}
      </Text>
    </group>
  );
}

function Link({ a, b }: { a: number; b: number }) {
  const na = useGame((s) => s.nodes[a]);
  const nb = useGame((s) => s.nodes[b]);
  const firewall = useGame((s) => s.firewallFor > 0);
  const pa = NETWORK.nodes[a].pos;
  const pb = NETWORK.nodes[b].pos;
  const packet = useRef<THREE.Mesh>(null);
  const offset = useMemo(() => Math.random(), []);
  const hot = na.status === "infected" ? na : nb.status === "infected" ? nb : null;
  const down = na.status === "isolated" || nb.status === "isolated";
  const color = down ? "#26304a" : hot ? THREATS[hot.threat!].color : firewall ? "#3bff8a" : "#1c7fa8";
  useFrame(({ clock }) => {
    if (!packet.current) return;
    const t = (clock.elapsedTime * (hot ? 0.9 : 0.35) + offset) % 1;
    packet.current.position.set(pa[0] + (pb[0] - pa[0]) * t, 0.25, pa[2] + (pb[2] - pa[2]) * t);
    packet.current.visible = !down;
  });
  return (
    <>
      <Line points={[[pa[0], 0.25, pa[2]], [pb[0], 0.25, pb[2]]]} color={color} lineWidth={hot ? 2.5 : 1.3} transparent opacity={0.85} />
      <mesh ref={packet}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </>
  );
}

function FirewallDome() {
  const on = useGame((s) => s.firewallFor > 0);
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (m.current) m.current.rotation.y = clock.elapsedTime * 0.2;
  });
  if (!on) return null;
  return (
    <mesh ref={m} position={[0, 0, 1.5]}>
      <sphereGeometry args={[14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color="#3bff8a" wireframe transparent opacity={0.15} />
    </mesh>
  );
}

export function GameScene() {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 16, 17], fov: 50 }} onPointerMissed={() => useGame.getState().select(null)}>
      <color attach="background" args={["#060912"]} />
      <fog attach="fog" args={["#060912", 22, 55]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 14, 6]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 6, 0]} intensity={30} color="#22e1ff" distance={25} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 6, 0]} scale={[12, 12, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.5} color="#ff3bd4" position={[-8, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1.5} color="#22e1ff" position={[8, 2, -2]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0a0f1d" metalness={0.8} roughness={0.4} />
      </mesh>
      <Grid position={[0, 0, 0]} args={[80, 80]} cellSize={1} cellColor="#12304a" sectionSize={5} sectionColor="#1f6d96" fadeDistance={45} infiniteGrid />
      {NETWORK.links.map(([a, b]) => (
        <Link key={`${a}-${b}`} a={a} b={b} />
      ))}
      <Suspense fallback={null}>
        {NETWORK.nodes.map((n) => (
          <NetNodeView key={n.id} i={n.id} />
        ))}
      </Suspense>
      <FirewallDome />
      <Loop />
      <OrbitControls enablePan={false} minDistance={12} maxDistance={32} maxPolarAngle={1.2} target={[0, 0, 1.5]} />
    </Canvas>
  );
}
