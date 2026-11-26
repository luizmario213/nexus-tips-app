"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";

// =====================================================================================
// NEXUS CORE — o "motor" da marca em 3D.
// Um núcleo de energia (shader com deformação + fresnel), casca em wireframe, anéis
// orbitais, campo de partículas e 5 agentes orbitando, cada um ligado ao núcleo por um
// feixe com "pacotes de dados" viajando até o centro. Reage ao mouse (parallax), ao
// clique (onda de choque) e ao estado da demo (agentes acendem em sequência).
// =====================================================================================

export type AgentState = "pending" | "active" | "done";

export interface NexusCoreProps {
  /** índice da etapa da demo: 0..4 = agente ativo, 5 = correlação no núcleo, -1 = ocioso */
  step?: number;
  /** quando true, todos os agentes ficam "done" (verde) */
  complete?: boolean;
  /** desloca o núcleo no eixo X (em unidades do mundo) — usado no hero de desktop */
  offsetX?: number;
  /** desloca o núcleo no eixo Y */
  offsetY?: number;
  /** escala geral da cena */
  scale?: number;
  /** densidade do campo de partículas */
  particles?: number;
  /** refs de elementos HTML que vão "grudar" na posição 3D de cada agente */
  labelRefs?: MutableRefObject<(HTMLElement | null)[]>;
  /** elemento que recebe os eventos de ponteiro (permite texto por cima do canvas) */
  eventSource?: RefObject<HTMLElement>;
  onAgentClick?: (i: number) => void;
  className?: string;
}

const AGENT_COUNT = 5;
const C_BLUE = new THREE.Color("#4F7BFF");
const C_CYAN = new THREE.Color("#33D6F5");
const C_VIOLET = new THREE.Color("#9B6BFF");
const C_GREEN = new THREE.Color("#14E3A0");
const C_DIM = new THREE.Color("#2A3766");

// Textura de brilho radial gerada em canvas — evita carregar imagem externa.
function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.18, "rgba(255,255,255,0.75)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.18)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

const coreVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform float uHover;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;
  float n3(vec3 p){
    return sin(p.x*1.7+uTime*0.9)*sin(p.y*2.1+uTime*0.7)*sin(p.z*1.9+uTime*1.1);
  }
  void main(){
    vec3 p = position;
    float d = n3(normal*2.2)*0.13 + n3(normal*4.3+1.3)*0.06 + n3(normal*7.0-2.0)*0.025;
    d *= 1.0 + uHover*0.8;
    d += uPulse*0.22;
    vDisp = d;
    p += normal * d;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    vView = normalize(-mv.xyz);
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const coreFragment = /* glsl */ `
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform float uTime;
  uniform float uHover;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDisp;
  void main(){
    float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.0);
    vec3 col = mix(uA, uB, smoothstep(-0.12, 0.16, vDisp));
    col = mix(col, uC, f);
    float bands = 0.5 + 0.5*sin(vDisp*46.0 + uTime*2.4);
    col += bands * 0.07;
    float a = 0.22 + f*0.95;
    gl_FragColor = vec4(col * (0.65 + f*1.7 + uHover*0.35 + uPulse*0.8), a);
  }
`;

function Core({ pulse, hovered, complete, tex }: { pulse: MutableRefObject<number>; hovered: boolean; complete: boolean; tex: THREE.Texture }) {
  const mesh = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const shell2 = useRef<THREE.Mesh>(null);
  const hover = useRef(0);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uHover: { value: 0 },
      uA: { value: new THREE.Color("#1a2c8a") },
      uB: { value: C_BLUE.clone() },
      uC: { value: C_CYAN.clone() },
    }),
    []
  );

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    hover.current = THREE.MathUtils.damp(hover.current, hovered ? 1 : 0, 6, dt);
    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 2.6, dt);
    uniforms.uHover.value = hover.current;
    uniforms.uPulse.value = pulse.current;
    // quando a correlação conclui, a cor "vira" pro verde do green
    uniforms.uC.value.lerp(complete ? C_GREEN : C_CYAN, 1 - Math.exp(-dt * 3));
    uniforms.uB.value.lerp(complete ? new THREE.Color("#18b98a") : C_BLUE, 1 - Math.exp(-dt * 3));
    if (mesh.current) {
      mesh.current.rotation.y += dt * 0.15;
      mesh.current.rotation.x += dt * 0.05;
      const s = 1 + hover.current * 0.06 + pulse.current * 0.12;
      mesh.current.scale.setScalar(s);
    }
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.22;
      shell.current.rotation.z += dt * 0.08;
    }
    if (shell2.current) {
      shell2.current.rotation.x += dt * 0.12;
      shell2.current.rotation.y += dt * 0.1;
      const s2 = 1.55 + Math.sin(uniforms.uTime.value * 0.8) * 0.03 + pulse.current * 0.5;
      shell2.current.scale.setScalar(s2);
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 24]} />
        <shaderMaterial
          vertexShader={coreVertex}
          fragmentShader={coreFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* núcleo interno brilhante */}
      <sprite scale={[1.5, 1.5, 1.5]}>
        <spriteMaterial map={tex} color={complete ? "#8dffd9" : "#a9c3ff"} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.32, 1]} />
        <meshBasicMaterial color="#6f8fff" wireframe transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={shell2}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color="#9b6bff" wireframe transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Rings() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => {
      c.rotation.z += dt * (0.1 + i * 0.07) * (i % 2 ? -1 : 1);
    });
  });
  const rings = [
    { r: 2.05, tilt: [1.2, 0.2, 0], color: "#4F7BFF", o: 0.32 },
    { r: 2.45, tilt: [1.45, -0.5, 0.3], color: "#33D6F5", o: 0.18 },
    { r: 2.95, tilt: [1.0, 0.7, -0.2], color: "#9B6BFF", o: 0.14 },
  ];
  return (
    <group ref={g}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={r.tilt as [number, number, number]}>
          <torusGeometry args={[r.r, 0.006, 8, 220]} />
          <meshBasicMaterial color={r.color} transparent opacity={r.o} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Particles({ count, tex }: { count: number; tex: THREE.Texture }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [C_BLUE, C_CYAN, C_VIOLET, new THREE.Color("#ffffff")];
    for (let i = 0; i < count; i++) {
      // distribuição em casca esférica + um disco achatado (tipo galáxia)
      const disc = Math.random() < 0.55;
      const r = disc ? 3 + Math.random() * 6.5 : 3.4 + Math.random() * 8;
      const th = Math.random() * Math.PI * 2;
      const ph = disc ? Math.PI / 2 + (Math.random() - 0.5) * 0.35 : Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = r * Math.cos(ph);
      positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.025;
    }
  });

  return (
    <points ref={ref} rotation={[0.35, 0, 0.15]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        map={tex}
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Configuração orbital de cada agente: raio, inclinação e velocidade próprios.
const ORBITS = Array.from({ length: AGENT_COUNT }, (_, i) => ({
  radius: 2.35 + (i % 2) * 0.35,
  incl: -0.5 + i * 0.25,
  node: (i / AGENT_COUNT) * Math.PI * 2,
  speed: 0.16 + i * 0.015,
}));

function Agents({
  states,
  tex,
  labelRefs,
  onAgentClick,
  setCursor,
}: {
  states: AgentState[];
  tex: THREE.Texture;
  labelRefs?: MutableRefObject<(HTMLElement | null)[]>;
  onAgentClick?: (i: number) => void;
  setCursor: (v: boolean) => void;
}) {
  const nodes = useRef<(THREE.Group | null)[]>([]);
  const lines = useRef<(THREE.Line | null)[]>([]);
  const packets = useRef<(THREE.Sprite | null)[]>([]);
  const glows = useRef<(THREE.Sprite | null)[]>([]);
  const t = useRef(0);
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const lineGeos = useMemo(
    () =>
      Array.from({ length: AGENT_COUNT }, () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
        return g;
      }),
    []
  );
  const lineObjs = useMemo(
    () =>
      lineGeos.map(
        (g) =>
          new THREE.Line(
            g,
            new THREE.LineBasicMaterial({ color: "#4F7BFF", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })
          )
      ),
    [lineGeos]
  );
  useEffect(() => {
    lines.current = lineObjs;
  }, [lineObjs]);

  useFrame((_, dt) => {
    t.current += dt;
    ORBITS.forEach((o, i) => {
      const n = nodes.current[i];
      if (!n) return;
      const a = o.node + t.current * o.speed;
      // órbita inclinada
      const x = Math.cos(a) * o.radius;
      const z = Math.sin(a) * o.radius;
      const y = z * Math.sin(o.incl);
      n.position.set(x, y, z * Math.cos(o.incl));

      const st = states[i];
      const color = st === "done" ? C_GREEN : st === "active" ? C_CYAN : C_DIM;
      const pulse = st === "active" ? 1 + Math.sin(t.current * 8) * 0.25 : 1;
      const mat = (n.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.color.lerp(color, 1 - Math.exp(-dt * 6));
      n.scale.setScalar(THREE.MathUtils.damp(n.scale.x, (st === "pending" ? 0.8 : 1.15) * pulse, 8, dt));

      const glow = glows.current[i];
      if (glow) {
        (glow.material as THREE.SpriteMaterial).color.lerp(st === "pending" ? C_BLUE : color, 1 - Math.exp(-dt * 6));
        (glow.material as THREE.SpriteMaterial).opacity = st === "pending" ? 0.35 : 0.95;
      }

      // feixe do agente até o núcleo
      const line = lines.current[i];
      if (line) {
        const pos = line.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, n.position.x, n.position.y, n.position.z);
        pos.setXYZ(1, 0, 0, 0);
        pos.needsUpdate = true;
        const lm = line.material as THREE.LineBasicMaterial;
        lm.color.lerp(st === "pending" ? C_BLUE : color, 1 - Math.exp(-dt * 6));
        lm.opacity = THREE.MathUtils.damp(lm.opacity, st === "pending" ? 0.12 : 0.75, 6, dt);
      }

      // pacote de dados viajando do agente até o núcleo
      const p = packets.current[i];
      if (p) {
        const speed = st === "active" ? 1.6 : st === "done" ? 0.6 : 0.25;
        const k = (t.current * speed + i * 0.21) % 1;
        p.position.copy(n.position).multiplyScalar(1 - k);
        (p.material as THREE.SpriteMaterial).opacity = (st === "pending" ? 0.25 : 1) * Math.sin(k * Math.PI);
        (p.material as THREE.SpriteMaterial).color.copy(st === "done" ? C_GREEN : C_CYAN);
      }

      // projeta a posição 3D na tela e move o label HTML correspondente
      const el = labelRefs?.current?.[i];
      if (el) {
        n.getWorldPosition(v);
        v.project(camera);
        const sx = (v.x * 0.5 + 0.5) * size.width;
        const sy = (-v.y * 0.5 + 0.5) * size.height;
        const behind = v.z > 1;
        el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -140%)`;
        el.style.opacity = behind ? "0" : "1";
      }
    });
  });

  return (
    <group>
      {lineObjs.map((l, i) => (
        <primitive key={`l${i}`} object={l} />
      ))}
      {ORBITS.map((_, i) => (
        <group
          key={i}
          ref={(r) => {
            nodes.current[i] = r;
          }}
          onClick={(e) => {
            e.stopPropagation();
            onAgentClick?.(i);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setCursor(true);
          }}
          onPointerOut={() => setCursor(false)}
        >
          <mesh>
            <icosahedronGeometry args={[0.11, 2]} />
            <meshBasicMaterial color="#2A3766" />
          </mesh>
          {/* área de clique maior que a esfera visível */}
          <mesh visible={false}>
            <sphereGeometry args={[0.32, 8, 8]} />
            <meshBasicMaterial />
          </mesh>
          <sprite
            ref={(r) => {
              glows.current[i] = r;
            }}
            scale={[0.9, 0.9, 0.9]}
          >
            <spriteMaterial map={tex} color="#4F7BFF" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      ))}
      {ORBITS.map((_, i) => (
        <sprite
          key={`p${i}`}
          ref={(r) => {
            packets.current[i] = r;
          }}
          scale={[0.28, 0.28, 0.28]}
        >
          <spriteMaterial map={tex} color="#33D6F5" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

// Onda de choque ao clicar no núcleo
function Shockwave({ trigger }: { trigger: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const life = useRef(1);
  useEffect(() => {
    if (trigger) life.current = 0;
  }, [trigger]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    life.current = Math.min(1, life.current + dt * 0.9);
    const k = life.current;
    ref.current.scale.setScalar(1 + k * 5);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.6;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.3, 0, 0]}>
      <ringGeometry args={[0.95, 1.0, 96]} />
      <meshBasicMaterial color="#33D6F5" transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function Scene({
  states,
  complete,
  offsetX = 0,
  offsetY = 0,
  scale = 1,
  particles = 2400,
  labelRefs,
  onAgentClick,
  step,
}: NexusCoreProps & { states: AgentState[] }) {
  const root = useRef<THREE.Group>(null);
  const tex = useGlowTexture();
  const [hovered, setHovered] = useState(false);
  const [cursor, setCursor] = useState(false);
  const [shock, setShock] = useState(0);
  const pulse = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  const scrollY = useRef(0);
  const { gl } = useThree();

  // parallax pelo mouse em qualquer lugar da janela (não só em cima do canvas)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered || cursor ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, cursor, gl]);

  // cada mudança de etapa dá um "soco" de energia no núcleo
  useEffect(() => {
    if (step !== undefined && step >= 0) pulse.current = Math.max(pulse.current, 0.7);
  }, [step]);
  useEffect(() => {
    if (complete) {
      pulse.current = 1;
      setShock((s) => s + 1);
    }
  }, [complete]);

  useFrame((_, dt) => {
    if (!root.current) return;
    const sy = Math.min(scrollY.current / 900, 1.2);
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, mouse.current.x * 0.45 + sy * 0.8, 3, dt);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, mouse.current.y * 0.3 + sy * 0.25, 3, dt);
    root.current.position.y = THREE.MathUtils.damp(root.current.position.y, sy * 0.9, 3, dt);
  });

  return (
    <group position={[offsetX, offsetY, 0]} scale={scale}>
      <group ref={root}>
        <sprite scale={[6.5, 6.5, 6.5]}>
          <spriteMaterial map={tex} color={complete ? "#14E3A0" : "#3f5fff"} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
        <group
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            pulse.current = 1;
            setShock((s) => s + 1);
          }}
        >
          <Core pulse={pulse} hovered={hovered} complete={!!complete} tex={tex} />
        </group>
        <Rings />
        <Shockwave trigger={shock} />
        <Agents states={states} tex={tex} labelRefs={labelRefs} onAgentClick={onAgentClick} setCursor={setCursor} />
      </group>
      <Particles count={particles} tex={tex} />
    </group>
  );
}

export default function NexusCore(props: NexusCoreProps) {
  const { step = -1, complete = false, className = "", eventSource } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pausa o render quando a cena sai da tela — economiza bateria e GPU.
  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const states: AgentState[] = Array.from({ length: AGENT_COUNT }, (_, i) =>
    complete ? "done" : step < 0 ? "pending" : i < step ? "done" : i === step ? "active" : "pending"
  );

  return (
    <div ref={wrap} className={className}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7.5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={visible ? "always" : "never"}
        eventSource={eventSource as MutableRefObject<HTMLElement> | undefined}
        eventPrefix={eventSource ? "client" : undefined}
        style={{ pointerEvents: eventSource ? "none" : "auto" }}
      >
        <Scene {...props} states={states} />
      </Canvas>
    </div>
  );
}
