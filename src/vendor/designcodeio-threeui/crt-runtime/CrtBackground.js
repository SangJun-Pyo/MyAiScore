import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { createCrtRenderer, crtStyle, CRT_DEFAULTS, CRT_VARIANTS } from "./crtRenderer";
export { CRT_VARIANTS };
export function CrtBackground({ className = "", ...props }) {
    const hostRef = useRef(null), canvasRef = useRef(null), optionsRef = useRef({ ...CRT_DEFAULTS, ...props });
    optionsRef.current = { ...CRT_DEFAULTS, ...props };
    useEffect(() => { const host = hostRef.current, canvas = canvasRef.current; if (!host || !canvas)
        return undefined; const renderer = createCrtRenderer(host, canvas, () => optionsRef.current); let frame = 0, visible = true; const resize = () => { renderer.resize(); renderer.render(performance.now()); }, tick = (now) => { renderer.render(now); frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0; }; const resizeObserver = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; if (visible && !frame)
        frame = requestAnimationFrame(tick); if (!visible && frame)
        cancelAnimationFrame(frame), frame = 0; }); resizeObserver.observe(host); intersection.observe(host); resize(); frame = requestAnimationFrame(tick); return () => { if (frame)
        cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect(); renderer.dispose(); }; }, []);
    const options = optionsRef.current;
    return _jsx("div", { ref: hostRef, className: `threeui-background crt crt-${options.variant}${className ? ` ${className}` : ""}`, style: { background: crtStyle(options.variant).background, opacity: options.opacity, filter: `hue-rotate(${options.hue}deg) saturate(${options.saturation}) brightness(${options.brightness})` }, children: _jsx("canvas", { ref: canvasRef }) });
}
