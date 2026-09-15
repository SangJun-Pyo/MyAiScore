'use client';

import { useEffect, useId, useRef, useState } from 'react';

const AXES = ['A', 'B', 'C', 'D', 'E'] as const;
type Axis = typeof AXES[number];

/**
 * Adapted from ThreeUI Logic Core / platform-core.html (MIT, © 2026 Meng To).
 * License and attribution: third-party/threeui/LICENSE.txt and NOTICE.md.
 * Source revision: 68802d5428071ada5c20db8094b1649e6bb770ed.
 * https://threeui.com/three-js/structure-flow/logic-core
 * Preserves the (20,20,20) orthographic camera, 16×0.5×16 platform,
 * 2×4×2 core and 12 orbiting cubes with drift/pulse. React lifecycle,
 * seeded layout, five-axis selection and violet/cyan palette are local adaptations.
 * Only the 3D geometry/animation is ported; no original HTML, iframe or CDN runs.
 */
const NODE_LAYOUT = (() => {
  let seed = 37;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const axisIndices = [0, 2, 5, 7, 10];
  return Array.from({ length: 12 }, (_, index) => ({
    axis: AXES[axisIndices.indexOf(index)],
    angle: index / 12 * Math.PI * 2,
    radius: 4.3 + random() * 2.4,
    size: 0.4 + random() * 0.4,
    yBase: -0.9 + random() * 2.8,
    speed: (0.005 + random() * 0.015) * 60 * 0.35,
    yOffset: random() * Math.PI * 2,
  }));
})();

type Point3 = readonly [number, number, number];
function project([x, y, z]: Point3): string {
  return `${310 + (x - z) * Math.SQRT1_2 * 19},${210 + ((x + z) / Math.sqrt(6) - y * Math.sqrt(2 / 3)) * 19}`;
}
function StaticBox({ position: [x, y, z], size: [w, h, d], colors, stroke = '#596077', axis, selected = false }: {
  position: Point3; size: Point3; colors: readonly [string, string, string]; stroke?: string; axis?: Axis; selected?: boolean;
}) {
  const vertex = (dx: number, dy: number, dz: number) => project([x + dx * w / 2, y + dy * h / 2, z + dz * d / 2]);
  return <g data-axis={axis} data-active={axis ? selected : undefined} stroke={stroke} strokeWidth={selected ? 1.5 : 0.7} strokeLinejoin="round">
    <polygon points={[vertex(-1, 1, 1), vertex(1, 1, 1), vertex(1, -1, 1), vertex(-1, -1, 1)].join(' ')} fill={colors[2]} />
    <polygon points={[vertex(1, 1, -1), vertex(1, 1, 1), vertex(1, -1, 1), vertex(1, -1, -1)].join(' ')} fill={colors[1]} />
    <polygon points={[vertex(-1, 1, -1), vertex(1, 1, -1), vertex(1, 1, 1), vertex(-1, 1, 1)].join(' ')} fill={colors[0]} />
  </g>;
}

/** Decorative only: the assessment UI and its meaning never depend on WebGL. */
export default function HeroScene({ activeAxis = 'D' }: { activeAxis?: Axis } = {}) {
  const host = useRef<HTMLDivElement>(null);
  const selectedAxis = useRef<Axis>(activeAxis);
  const applySelection = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const gradientId = useId().replace(/:/g, '');

  // Updating the selection never reloads Three.js or allocates another scene.
  useEffect(() => {
    selectedAxis.current = activeAxis;
    applySelection.current?.();
  }, [activeAxis]);

  useEffect(() => {
    const mountedElement = host.current;
    if (!mountedElement) return;
    const element: HTMLDivElement = mountedElement;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    let cancelled = false;
    let disposeScene: (() => void) | undefined;
    let frame = 0;
    let sceneCanvas: HTMLCanvasElement | undefined;
    let visible = true;
    let contextAvailable = true;
    let renderFrame: ((time: number) => void) | undefined;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const resume = () => {
      if (!cancelled && visible && !document.hidden && !motion.matches && contextAvailable && !frame && renderFrame) {
        frame = requestAnimationFrame(renderFrame);
      }
    };
    const onVisibility = () => { if (document.hidden) stop(); else resume(); };
    const onMotion = () => {
      if (motion.matches) { stop(); if (sceneCanvas) sceneCanvas.style.visibility = 'hidden'; setReady(false); }
      else if (disposeScene && contextAvailable) { if (sceneCanvas) sceneCanvas.style.visibility = 'visible'; setReady(true); resume(); }
      else if (!disposeScene) void start();
    };
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) resume(); else stop();
    }, { rootMargin: '0px' });
    intersection?.observe(element);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);

    let starting = false;
    async function start() {
      if (starting || cancelled || motion.matches || !contextAvailable) return;
      starting = true;
      try {
        const THREE = await import('three');
        if (cancelled || motion.matches) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        const canvas = renderer.domElement;
        sceneCanvas = canvas;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        element.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 1, 100);
        camera.position.set(20, 20, 20);
        camera.lookAt(0, -0.45, 0);
        const structure = new THREE.Group();
        scene.add(structure);
        const geometries = new Set<InstanceType<typeof THREE.BufferGeometry>>();
        const materials = new Set<InstanceType<typeof THREE.Material>>();
        const textures = new Set<InstanceType<typeof THREE.Texture>>();
        const geometry = <T extends InstanceType<typeof THREE.BufferGeometry>>(value: T): T => { geometries.add(value); return value; };
        const material = <T extends InstanceType<typeof THREE.Material>>(value: T): T => { materials.add(value); return value; };
        let resize: ResizeObserver | undefined;

        const contextLost = (event: Event) => {
          event.preventDefault(); contextAvailable = false; stop();
          disposeScene?.(); disposeScene = undefined;
          if (!cancelled) setReady(false);
        };
        const pointer = new THREE.Vector2();
        const onPointer = (event: PointerEvent) => {
          // Touch scrolling must not steer or capture the decorative scene.
          if (event.pointerType === 'touch' || coarsePointer.matches) return;
          const bounds = element!.getBoundingClientRect();
          pointer.set((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5,
            (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5);
        };
        const resetPointer = () => pointer.set(0, 0);
        disposeScene = () => {
          stop(); resize?.disconnect(); applySelection.current = null;
          element!.removeEventListener('pointermove', onPointer);
          element!.removeEventListener('pointerleave', resetPointer);
          canvas.removeEventListener('webglcontextlost', contextLost);
          for (const item of geometries) item.dispose();
          for (const item of materials) item.dispose();
          for (const item of textures) item.dispose();
          renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
        };
        canvas.addEventListener('webglcontextlost', contextLost);
        element.addEventListener('pointermove', onPointer, { passive: true });
        element.addEventListener('pointerleave', resetPointer);

        scene.add(new THREE.AmbientLight(0xc8d0ef, 1.35));
        const keyLight = new THREE.DirectionalLight(0xf1edff, 2.8);
        keyLight.position.set(10, 20, 5); scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x9b8bdf, 0.85);
        rimLight.position.set(-8, 5, -6); scene.add(rimLight);
        const pointLight = new THREE.PointLight(0x63cfd7, 5, 18);
        pointLight.position.set(0, 1, 0); scene.add(pointLight);

        const platformGeo = geometry(new THREE.BoxGeometry(16, 0.5, 16));
        const platform = new THREE.Mesh(platformGeo, material(new THREE.MeshStandardMaterial({ color: 0x141721, roughness: 0.86, metalness: 0.18 })));
        platform.position.y = -2; structure.add(platform);
        const platformEdges = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(platformGeo)), material(new THREE.LineBasicMaterial({ color: 0x72768d, transparent: true, opacity: 0.34 })));
        platform.add(platformEdges);
        const gridPoints: InstanceType<typeof THREE.Vector3>[] = [];
        for (let coordinate = -6; coordinate <= 6; coordinate += 2) {
          gridPoints.push(new THREE.Vector3(coordinate, -1.744, -8), new THREE.Vector3(coordinate, -1.744, 8),
            new THREE.Vector3(-8, -1.744, coordinate), new THREE.Vector3(8, -1.744, coordinate));
        }
        structure.add(new THREE.LineSegments(geometry(new THREE.BufferGeometry().setFromPoints(gridPoints)), material(new THREE.LineBasicMaterial({ color: 0x737994, transparent: true, opacity: 0.12, depthWrite: false }))));

        const coreMaterial = material(new THREE.MeshPhysicalMaterial({ color: 0x67c9d5, emissive: 0x24677c, emissiveIntensity: 0.18,
          roughness: 0.26, metalness: 0.22, clearcoat: 0.75, clearcoatRoughness: 0.2, transparent: true, opacity: 0.94 }));
        const coreGeo = geometry(new THREE.BoxGeometry(2, 4, 2));
        const core = new THREE.Mesh(coreGeo, coreMaterial); core.position.y = 0.25; structure.add(core);
        core.add(new THREE.LineSegments(geometry(new THREE.EdgesGeometry(coreGeo)), material(new THREE.LineBasicMaterial({ color: 0xb5eff4, transparent: true, opacity: 0.65 }))));
        const socket = new THREE.Mesh(geometry(new THREE.BoxGeometry(3.2, 0.12, 3.2)), material(new THREE.MeshStandardMaterial({ color: 0x27263c, metalness: 0.35, roughness: 0.4 })));
        socket.position.y = -1.68; structure.add(socket);
        socket.add(new THREE.LineSegments(geometry(new THREE.EdgesGeometry(socket.geometry)), material(new THREE.LineBasicMaterial({ color: 0x9c8adc, transparent: true, opacity: 0.5 }))));
        const cap = new THREE.Mesh(geometry(new THREE.BoxGeometry(2.03, 0.045, 2.03)), material(new THREE.MeshStandardMaterial({ color: 0xc1e6ed, roughness: 0.22, metalness: 0.45 })));
        cap.position.y = 2.272; structure.add(cap);

        const nodes = NODE_LAYOUT.map(data => {
          const color = data.axis ? 0x8880bf : 0x252937;
          const nodeMaterial = material(new THREE.MeshStandardMaterial({ color, roughness: data.axis ? 0.36 : 0.8, metalness: 0.2,
            emissive: data.axis ? 0x4e3d78 : 0x000000, emissiveIntensity: 0.12 }));
          const nodeGeo = geometry(new THREE.BoxGeometry(data.size, data.size, data.size));
          const mesh = new THREE.Mesh(nodeGeo, nodeMaterial);
          mesh.position.set(Math.cos(data.angle) * data.radius, data.yBase, Math.sin(data.angle) * data.radius);
          structure.add(mesh);
          const edgeMaterial = material(new THREE.LineBasicMaterial({ color: data.axis ? 0xb5a3e6 : 0x72778e, transparent: true, opacity: data.axis ? 0.48 : 0.25 }));
          mesh.add(new THREE.LineSegments(geometry(new THREE.EdgesGeometry(nodeGeo)), edgeMaterial));
          const ringPoints = Array.from({ length: 97 }, (_, i) => {
            const angle = i / 96 * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * data.radius, -1.733, Math.sin(angle) * data.radius);
          });
          const ring = data.axis ? new THREE.LineLoop(geometry(new THREE.BufferGeometry().setFromPoints(ringPoints)), material(new THREE.LineBasicMaterial({ color: 0xa797ed, transparent: true, opacity: 0.35, depthWrite: false }))) : null;
          if (ring) { ring.visible = false; structure.add(ring); }
          return { data, mesh, nodeMaterial, edgeMaterial, ring };
        });

        const fit = () => {
          const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
          const aspect = width / height;
          const halfWidth = Math.max(12.2, 11.5 * aspect);
          camera.left = -halfWidth; camera.right = halfWidth;
          camera.top = halfWidth / aspect; camera.bottom = -halfWidth / aspect;
          camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
          if (contextAvailable) renderer.render(scene, camera);
        };
        applySelection.current = () => {
          nodes.forEach(({ data, mesh, nodeMaterial, edgeMaterial, ring }) => {
            const selected = data.axis === selectedAxis.current;
            mesh.scale.setScalar(selected ? 1.45 : 1);
            nodeMaterial.color.setHex(selected ? 0x85d8e3 : data.axis ? 0x8880bf : 0x252937);
            nodeMaterial.emissive.setHex(selected ? 0x347080 : data.axis ? 0x4e3d78 : 0x000000);
            nodeMaterial.emissiveIntensity = selected ? 0.3 : 0.12;
            edgeMaterial.color.setHex(selected ? 0xc5f5ff : data.axis ? 0xb5a3e6 : 0x72778e);
            edgeMaterial.opacity = selected ? 0.9 : data.axis ? 0.48 : 0.25;
            if (ring) ring.visible = selected;
          });
          if (contextAvailable && visible && !document.hidden && !motion.matches) renderer.render(scene, camera);
        };
        applySelection.current();
        resize = new ResizeObserver(fit); resize.observe(element); fit();
        let elapsed = 0, previousTime = 0;
        renderFrame = (time) => {
          frame = 0;
          if (cancelled || !visible || document.hidden || motion.matches || !contextAvailable) return;
          const delta = Math.min((time - previousTime) / 1000, 0.035);
          elapsed += delta; previousTime = time;
          const drift = Math.sin(elapsed * 0.1) * 0.15;
          structure.rotation.y += (drift + pointer.x * 0.12 - structure.rotation.y) * 0.045;
          structure.rotation.x += (pointer.y * 0.045 - structure.rotation.x) * 0.04;
          structure.position.y = Math.sin(elapsed * 0.5) * 0.16;
          const pulse = (Math.sin(elapsed * 2.5) + 1) * 0.5;
          coreMaterial.emissiveIntensity = 0.13 + pulse * 0.13;
          pointLight.intensity = 4 + pulse * 2;
          nodes.forEach(({ data, mesh }) => {
            const angle = data.angle + elapsed * data.speed;
            mesh.position.x = Math.cos(angle) * data.radius;
            mesh.position.z = Math.sin(angle) * data.radius;
            mesh.position.y = data.yBase + Math.sin(elapsed * 1.5 + data.yOffset) * 0.38;
            mesh.rotation.set(elapsed * 0.18, elapsed * 0.32, 0);
          });
          renderer.render(scene, camera); resume();
        };
        setReady(true); resume();
      } catch {
        disposeScene?.(); disposeScene = undefined;
        if (!cancelled) setReady(false);
      } finally { starting = false; }
    }
    void start();
    return () => {
      cancelled = true; stop(); intersection?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion); disposeScene?.();
    };
  }, []);

  const selectedNode = NODE_LAYOUT.find(node => node.axis === activeAxis)!;
  const orbit = Array.from({ length: 97 }, (_, i) => {
    const angle = i / 96 * Math.PI * 2;
    return project([Math.cos(angle) * selectedNode.radius, -1.73, Math.sin(angle) * selectedNode.radius]);
  }).join(' ');
  const boxes = NODE_LAYOUT.map((node, i) => ({ node, i, x: Math.cos(node.angle) * node.radius, z: Math.sin(node.angle) * node.radius }));
  const renderNode = ({ node, i, x, z }: typeof boxes[number]) => {
    const selected = node.axis === activeAxis;
    const size = node.size * (selected ? 1.45 : 1);
    return <StaticBox key={i} position={[x, node.yBase, z]} size={[size, size, size]} axis={node.axis} selected={selected}
      colors={selected ? ['#aaeaf0', '#599daa', '#557c9a'] : node.axis ? ['#a69acc', '#655880', '#76649e'] : ['#434858', '#232735', '#2e3343']}
      stroke={selected ? '#d0f6fc' : node.axis ? '#b4a5d9' : '#62697c'} />;
  };
  return (
    <div ref={host} data-testid="hero-scene" data-style="threeui-logic-core" data-active-axis={activeAxis} data-renderer={ready ? "webgl" : "static"} aria-hidden="true" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300, overflow: 'hidden', isolation: 'isolate' }}>
      <svg viewBox="0 0 620 420" preserveAspectRatio="xMidYMid meet" focusable="false" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: ready ? 0 : 1, pointerEvents: 'none' }}>
        <defs><radialGradient id={`${gradientId}-ambient`}><stop stopColor="#7e70b7" stopOpacity=".12" /><stop offset="1" stopColor="#7e70b7" stopOpacity="0" /></radialGradient></defs>
        <ellipse cx="310" cy="263" rx="255" ry="152" fill={`url(#${gradientId}-ambient)`} />
        <StaticBox position={[0, -2, 0]} size={[16, 0.5, 16]} colors={['#1b1e29', '#0d111b', '#121722']} stroke="#53576b" />
        <g stroke="#69718a" strokeWidth=".65" opacity=".18">{[-6, -4, -2, 0, 2, 4, 6].map(value => <g key={value}>
          <polyline points={`${project([value, -1.74, -8])} ${project([value, -1.74, 8])}`} />
          <polyline points={`${project([-8, -1.74, value])} ${project([8, -1.74, value])}`} />
        </g>)}</g>
        <polyline points={orbit} fill="none" stroke="#a797ed" strokeWidth=".8" opacity=".48" />
        {boxes.filter(box => box.x + box.z < 0).sort((a, b) => a.x + a.z - b.x - b.z).map(renderNode)}
        <StaticBox position={[0, -1.68, 0]} size={[3.2, 0.12, 3.2]} colors={['#3b3551', '#292537', '#322942']} stroke="#8774b8" />
        <StaticBox position={[0, 0.25, 0]} size={[2, 4, 2]} colors={['#c1edf0', '#579faf', '#758ac5']} stroke="#a2d7e6" />
        {boxes.filter(box => box.x + box.z >= 0).sort((a, b) => a.x + a.z - b.x - b.z).map(renderNode)}
      </svg>
    </div>
  );
}
