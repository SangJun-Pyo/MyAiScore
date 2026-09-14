'use client';

import { useEffect, useId, useRef, useState } from 'react';

const AXES = ['A', 'B', 'C', 'D', 'E'] as const;
type Axis = typeof AXES[number];

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
        renderer.toneMappingExposure = 1.3;
        const canvas = renderer.domElement;
        sceneCanvas = canvas;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        element.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
        camera.position.set(0, 0.12, 7.9);
        const structure = new THREE.Group();
        structure.rotation.set(0.25, -0.3, -0.12);
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
          if (event.pointerType === 'touch') return;
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

        scene.add(new THREE.AmbientLight(0xaeb4ff, 1.8));
        const purpleLight = new THREE.PointLight(0x9f7aff, 25, 15);
        purpleLight.position.set(-2, 2, 3); scene.add(purpleLight);
        const cyanLight = new THREE.PointLight(0x63e5ee, 18, 12);
        cyanLight.position.set(2, -0.5, 2); scene.add(cyanLight);
        const shell = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(0.98, 1)), material(new THREE.MeshPhysicalMaterial({
          color: 0x8b7df5, metalness: 0.48, roughness: 0.19, transparent: true,
          opacity: 0.35, emissive: 0x29204d, emissiveIntensity: 0.5,
          clearcoat: 1, clearcoatRoughness: 0.2, depthWrite: false,
        })));
        structure.add(shell);
        const edges = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(shell.geometry)), material(new THREE.LineBasicMaterial({
          color: 0xb6a0ff, transparent: true, opacity: 0.37, depthWrite: false,
        })));
        shell.add(edges);
        const core = new THREE.Mesh(geometry(new THREE.IcosahedronGeometry(0.37, 0)), material(new THREE.MeshStandardMaterial({
          color: 0xe4daff, emissive: 0x9c78ff, emissiveIntensity: 1.7, metalness: 0.3, roughness: 0.3,
        })));
        structure.add(core);

        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 128;
        const brush = glowCanvas.getContext('2d');
        if (brush) {
          const gradient = brush.createRadialGradient(64, 64, 0, 64, 64, 64);
          gradient.addColorStop(0, 'rgba(190,155,255,0.62)');
          gradient.addColorStop(0.3, 'rgba(127,82,255,0.18)');
          gradient.addColorStop(1, 'rgba(99,65,230,0)');
          brush.fillStyle = gradient; brush.fillRect(0, 0, 128, 128);
          const texture = new THREE.CanvasTexture(glowCanvas); textures.add(texture);
          const glow = new THREE.Sprite(material(new THREE.SpriteMaterial({
            map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          })));
          glow.scale.set(3.5, 3.5, 1); structure.add(glow);
        }

        const orbitMaterial = material(new THREE.MeshBasicMaterial({ color: 0x8274da, transparent: true, opacity: 0.22, depthWrite: false }));
        const orbit = new THREE.Mesh(geometry(new THREE.TorusGeometry(1.98, 0.006, 5, 140)), orbitMaterial);
        orbit.rotation.x = 0.72; structure.add(orbit);
        const secondOrbit = new THREE.Mesh(orbit.geometry, material(new THREE.MeshBasicMaterial({ color: 0x70c9df, transparent: true, opacity: 0.13, depthWrite: false })));
        secondOrbit.rotation.set(-0.73, 0.5, 0.25); secondOrbit.scale.setScalar(1.15); structure.add(secondOrbit);

        const nodes = new THREE.Group(); structure.add(nodes);
        const nodeGeometry = geometry(new THREE.IcosahedronGeometry(0.10, 1));
        const positions: InstanceType<typeof THREE.Vector3>[] = [];
        const nodeObjects: InstanceType<typeof THREE.Mesh>[] = [];
        const nodeMaterials: InstanceType<typeof THREE.MeshStandardMaterial>[] = [];
        const halos: InstanceType<typeof THREE.Mesh>[] = [];
        const haloMaterials: InstanceType<typeof THREE.MeshBasicMaterial>[] = [];
        const links: InstanceType<typeof THREE.LineBasicMaterial>[] = [];
        for (let i = 0; i < 5; i++) {
          const angle = Math.PI / 2 - Math.PI * 2 * i / 5;
          const point = new THREE.Vector3(Math.cos(angle) * 2.04, Math.sin(angle) * 1.49, Math.sin(angle * 2 + 0.3) * 0.5);
          positions.push(point);
          const color = i % 2 === 0 ? 0xac91ff : 0x71dce4;
          const node = new THREE.Mesh(nodeGeometry, material(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.3 })));
          node.position.copy(point); nodes.add(node); nodeObjects.push(node); nodeMaterials.push(node.material);
          const halo = new THREE.Mesh(geometry(new THREE.TorusGeometry(0.19, 0.008, 5, 40)), material(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.56 })));
          halo.position.copy(point); nodes.add(halo); halos.push(halo); haloMaterials.push(halo.material);
          const link = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), point])), material(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 })));
          nodes.add(link); links.push(link.material);
        }
        const perimeter = new THREE.LineLoop(geometry(new THREE.BufferGeometry().setFromPoints(positions)), material(new THREE.LineBasicMaterial({ color: 0x8d84c3, transparent: true, opacity: 0.13 })));
        nodes.add(perimeter);

        // Seeded distribution prevents random visual jumps during remounts.
        let seed = 37;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        const dustPositions = new Float32Array(110 * 3);
        for (let i = 0; i < dustPositions.length; i += 3) {
          dustPositions[i] = (random() - 0.5) * 7;
          dustPositions[i + 1] = (random() - 0.5) * 4.7;
          dustPositions[i + 2] = (random() - 0.5) * 3 - 1;
        }
        const dustGeometry = geometry(new THREE.BufferGeometry());
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        const dust = new THREE.Points(dustGeometry, material(new THREE.PointsMaterial({ color: 0xafa1e4, size: 0.016, transparent: true, opacity: 0.55, depthWrite: false })));
        scene.add(dust);

        const fit = () => {
          const width = Math.max(1, element!.clientWidth), height = Math.max(1, element!.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.z = width / height < 1.1 ? 9.4 : 7.9;
          camera.updateProjectionMatrix();
          if (contextAvailable) renderer.render(scene, camera);
        };
        applySelection.current = () => {
          nodeObjects.forEach((node, index) => {
            const selected = AXES[index] === selectedAxis.current;
            node.scale.setScalar(selected ? 1.7 : 1);
            nodeMaterials[index]!.emissiveIntensity = selected ? 2.3 : 0.65;
            halos[index]!.scale.setScalar(selected ? 1.45 : 1);
            haloMaterials[index]!.opacity = selected ? 0.95 : 0.32;
            links[index]!.opacity = selected ? 0.65 : 0.13;
          });
          if (contextAvailable && visible && !document.hidden && !motion.matches) renderer.render(scene, camera);
        };
        applySelection.current();
        resize = new ResizeObserver(fit); resize.observe(element); fit();
        let elapsed = 0, previousTime = 0;
        renderFrame = (time) => {
          frame = 0;
          if (cancelled || !visible || document.hidden || motion.matches || !contextAvailable) return;
          elapsed += Math.min((time - previousTime) / 1000, 0.035); previousTime = time;
          structure.rotation.y += ((-0.3 + pointer.x * 0.2) - structure.rotation.y) * 0.035;
          structure.rotation.x += ((0.25 + pointer.y * 0.13) - structure.rotation.x) * 0.035;
          structure.position.y = Math.sin(elapsed * 0.48) * 0.075;
          shell.rotation.y = elapsed * 0.1; shell.rotation.z = elapsed * 0.04;
          core.rotation.set(elapsed * 0.16, elapsed * -0.22, 0.2);
          dust.rotation.y = elapsed * 0.014;
          nodeObjects.forEach((node, index) => node.scale.setScalar(
            (AXES[index] === selectedAxis.current ? 1.7 : 1) * (1 + Math.sin(elapsed * 0.85 + index) * 0.06),
          ));
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

  return (
    <div ref={host} data-testid="hero-scene" data-active-axis={activeAxis} data-renderer={ready ? "webgl" : "static"} aria-hidden="true" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 380, overflow: 'hidden', isolation: 'isolate' }}>
      <svg viewBox="0 0 620 420" preserveAspectRatio="xMidYMid meet" focusable="false" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: ready ? 0 : 1, pointerEvents: 'none' }}>
        <defs>
          <radialGradient id={`${gradientId}-glow`}><stop stopColor="#9270e8" stopOpacity=".19" /><stop offset="1" stopColor="#9270e8" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${gradientId}-face`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b9a1ff" stopOpacity=".3" /><stop offset="1" stopColor="#6862bd" stopOpacity=".04" /></linearGradient>
        </defs>
        <ellipse cx="310" cy="214" rx="215" ry="178" fill={`url(#${gradientId}-glow)`} />
        <g fill="none" strokeWidth=".8">
          <ellipse cx="310" cy="214" rx="175" ry="65" stroke="#9683d2" opacity=".3" transform="rotate(-24 310 214)" />
          <ellipse cx="310" cy="214" rx="158" ry="88" stroke="#70c9df" opacity=".2" transform="rotate(34 310 214)" />
          <path d="M310 71 477 180 413 332 208 332 143 180Z M310 214 310 71 M310 214 477 180 M310 214 413 332 M310 214 208 332 M310 214 143 180" stroke="#9b8ccd" opacity=".28" />
        </g>
        <path d="M310 136 377 175 387 242 330 287 258 266 234 198 265 148Z" fill={`url(#${gradientId}-face)`} stroke="#b6a0ff" strokeOpacity=".6" />
        <path d="m310 136 20 151m-96-89 143-23m-119 91 119-91m-143 23 153 44m-122-94 65 139" fill="none" stroke="#b6a0ff" strokeOpacity=".22" />
        <path d="m310 193 20 16-8 25h-25l-8-25Z" fill="#c5b6ff" fillOpacity=".85" />
        {[[310, 71], [477, 180], [413, 332], [208, 332], [143, 180]].map(([x, y], i) => (
          <g key={i} data-axis={AXES[i]} data-active={AXES[i] === activeAxis}>
            <line x1="310" y1="214" x2={x} y2={y} stroke={i % 2 ? '#71dce4' : '#ac91ff'} strokeOpacity={AXES[i] === activeAxis ? 0.65 : 0} />
            <g transform={`translate(${x} ${y})`}>
              {AXES[i] === activeAxis && <circle r="25" fill={i % 2 ? '#71dce4' : '#ac91ff'} fillOpacity=".1" />}
              <circle r={AXES[i] === activeAxis ? 17 : 12} fill="none" stroke={i % 2 ? '#71dce4' : '#ac91ff'} strokeWidth={AXES[i] === activeAxis ? 1.5 : 1} strokeOpacity={AXES[i] === activeAxis ? 0.95 : 0.35} />
              <circle r={AXES[i] === activeAxis ? 6 : 4} fill={i % 2 ? '#71dce4' : '#ac91ff'} />
            </g>
          </g>
        ))}
        {[[104, 125], [177, 280], [252, 86], [402, 107], [528, 259], [356, 349], [123, 328], [509, 107], [239, 370], [443, 271]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i % 3 ? 1 : 1.5} fill="#afa1e4" opacity=".4" />)}
      </svg>
    </div>
  );
}
