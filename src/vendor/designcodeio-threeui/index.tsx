"use client";

import { Suspense, lazy, type CSSProperties } from "react";
import { type UplinkLoaderProps } from "../../shaders/uplink-loader/UplinkLoader";

type CrtBackgroundProps = {
  variant?: "terminal" | "cinematic" | "blue-screen" | "nintendo";
  speed?: number;
  typeSpeed?: number;
  motion?: number;
  brightness?: number;
  opacity?: number;
  hue?: number;
  saturation?: number;
  className?: string;
};

const CrtBackgroundComponent = lazy(() =>
  import("./crt-runtime/CrtBackground.js").then(module => ({
    default: module.CrtBackground,
  })),
);

const UplinkLoaderComponent = lazy(() =>
  import("../../shaders/uplink-loader/UplinkLoader").then(module => ({
    default: module.UplinkLoader,
  })),
);

const fallbackStyle: CSSProperties = { background: "#090909" };

export function CrtBackground(props: CrtBackgroundProps) {
  return (
    <Suspense fallback={<div className="threeui-background" style={fallbackStyle} />}>
      <CrtBackgroundComponent {...props} />
    </Suspense>
  );
}

export function UplinkLoader(props: UplinkLoaderProps) {
  return (
    <Suspense fallback={<div className="threeui-background" style={fallbackStyle} />}>
      <UplinkLoaderComponent {...props} />
    </Suspense>
  );
}
