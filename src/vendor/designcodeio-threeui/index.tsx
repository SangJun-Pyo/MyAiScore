"use client";

import { Suspense, lazy, type CSSProperties } from "react";
import { type UplinkLoaderProps } from "../../shaders/uplink-loader/UplinkLoader";

const UplinkLoaderComponent = lazy(() =>
  import("../../shaders/uplink-loader/UplinkLoader").then(module => ({
    default: module.UplinkLoader,
  })),
);

const fallbackStyle: CSSProperties = { background: "#090909" };

export function UplinkLoader(props: UplinkLoaderProps) {
  return (
    <Suspense fallback={<div className="threeui-background" style={fallbackStyle} />}>
      <UplinkLoaderComponent {...props} />
    </Suspense>
  );
}
