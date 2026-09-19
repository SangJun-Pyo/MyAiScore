"use client";

import { useMemo, type CSSProperties } from "react";

import logicCoreSource from "../../../shaders/neuform-isolated/sources/platform-core.html?raw";

type StructureFlowVariant = "logic-core";

export type StructureFlowCollectionProps = {
  variant?: StructureFlowVariant;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

const EFFECT = {
  title: "Logic Core isometric field",
  source: logicCoreSource,
  background: "#050505",
  targetSelector: "#three-canvas-container",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function buildFocusedDocument() {
  const focusStyle = `<style data-threeui-focus>
html, body { width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: ${EFFECT.background} !important; color-scheme: dark !important; }
body { position: relative !important; display: flex !important; align-items: center !important; justify-content: center !important; }
body > * { visibility: hidden !important; }
body[data-threeui-ready] > [data-threeui-role] { visibility: visible !important; }
[data-threeui-residual] { display: none !important; }
[data-threeui-role="background"] { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; z-index: 0 !important; opacity: 1 !important; pointer-events: none !important; }
</style>`;
  const focusScript = `<script data-threeui-focus>
(function () {
  var isolated = false;
  function isolate() {
    if (isolated) return;
    var root = document.querySelector('${EFFECT.targetSelector}');
    if (!root) return;
    isolated = true;
    root.setAttribute('data-threeui-role', 'background');
    document.body.appendChild(root);
    Array.from(document.body.children).forEach(function (element) {
      if (element === root) return;
      element.setAttribute('data-threeui-residual', '');
      element.setAttribute('aria-hidden', 'true');
      if ('inert' in element) element.inert = true;
    });
    document.body.setAttribute('data-threeui-ready', '');
    requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
  }
  function scheduleIsolation() { setTimeout(isolate, 100); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleIsolation, { once: true });
  else scheduleIsolation();
  window.addEventListener('load', isolate, { once: true });
})();
</script>`;

  return EFFECT.source
    .replace(/<\/head>/i, `${focusStyle}</head>`)
    .replace(/<\/body>/i, `${focusScript}</body>`);
}

export function StructureFlowCollection({
  variant = "logic-core",
  hue = 0,
  saturation = 1,
  brightness = 1,
  className = "",
  style,
}: StructureFlowCollectionProps) {
  const source = useMemo(() => buildFocusedDocument(), []);
  const safeHue = clamp(hue, -180, 180);
  const safeSaturation = clamp(saturation, 0, 2);
  const safeBrightness = clamp(brightness, 0.35, 1.65);
  const filter = safeHue === 0 && safeSaturation === 1 && safeBrightness === 1
    ? undefined
    : `hue-rotate(${safeHue}deg) saturate(${safeSaturation}) brightness(${safeBrightness})`;

  if (variant !== "logic-core") return null;

  return (
    <iframe
      className={className}
      data-variant={variant}
      title={EFFECT.title}
      srcDoc={source}
      sandbox="allow-scripts"
      loading="eager"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        border: 0,
        background: EFFECT.background,
        filter,
        ...style,
      }}
    />
  );
}
