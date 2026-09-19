"use client";

import { Suspense, lazy, type CSSProperties } from "react";
import { type NeuformIsolatedEffectProps } from "../../shaders/neuform-isolated/NeuformIsolatedEffects";
import { type UplinkLoaderProps } from "../../shaders/uplink-loader/UplinkLoader";

export type TextAnimationVariant = "threeui-intro";

export type TextAnimationCollectionProps = NeuformIsolatedEffectProps & {
  variant: TextAnimationVariant;
};

const ThreeUIIntro = lazy(() =>
  import("../../shaders/neuform-isolated/NeuformIsolatedEffects").then(module => ({
    default: module.ThreeUIIntro,
  })),
);

const UplinkLoaderComponent = lazy(() =>
  import("../../shaders/uplink-loader/UplinkLoader").then(module => ({
    default: module.UplinkLoader,
  })),
);

const fallbackStyle: CSSProperties = { background: "#090909" };

export function TextAnimationCollection({ variant: _variant, ...props }: TextAnimationCollectionProps) {
  return (
    <Suspense fallback={<div className="threeui-background" style={fallbackStyle} />}>
      <ThreeUIIntro {...props} />
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
