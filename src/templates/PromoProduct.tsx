/**
 * PromoProduct template — promotional video for Whabi, Docflow, or Aurora.
 *
 * Structure:
 *   Scene 1: Hook (big kinetic text, spring bounce)
 *   Scene 2-4: Features (icon + text, staggered entrance from left)
 *   Scene 5: Big stat (animated counter)
 *   Scene 6: CTA + branding
 *
 * All motion uses spring physics. No AI-generated images.
 * Colors and branding come from brand.ts.
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/Inter";
import { BRANDS, DESIGN } from "./brand";

const { fontFamily } = loadFont();

// ---------------------------------------------------------------------------
// Zod schema (required by Remotion Composition for typed props)
// ---------------------------------------------------------------------------

export const promoProductSchema = z.object({
  brand: z.enum(["docflow", "whabi", "aurora"]),
  hook: z.string(),
  features: z.array(z.object({ text: z.string(), icon: z.string() })),
  stat: z.object({ number: z.string(), label: z.string() }),
  cta: z.string(),
});

// ---------------------------------------------------------------------------
// Props type
// ---------------------------------------------------------------------------

export type PromoProductProps = z.infer<typeof promoProductSchema>;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const HookScene: React.FC<{ text: string; accent: string }> = ({
  text,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 8, stiffness: 150 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: DESIGN.safePadding.sides,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          fontFamily,
          color: DESIGN.text,
          textAlign: "center",
          transform: `scale(${scale})`,
          opacity,
          lineHeight: 1.1,
          textShadow: `0 0 60px ${accent}40`,
        }}
      >
        {text}
      </div>
      {/* Accent line */}
      <div
        style={{
          width: interpolate(frame, [10, 25], [0, 200], {
            extrapolateRight: "clamp",
          }),
          height: 4,
          backgroundColor: accent,
          marginTop: 30,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};

const FeatureScene: React.FC<{
  text: string;
  icon: string;
  accent: string;
  index: number;
}> = ({ text, icon, accent, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const slideX = interpolate(entrance, [0, 1], [-100, 0]);
  const opacity = entrance;

  // Subtle pulse on the icon
  const pulse = Math.sin(frame * 0.1) * 3 + 1;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: DESIGN.safePadding.sides * 2,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          transform: `translateX(${slideX}px)`,
          opacity,
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: `${accent}20`,
            border: `3px solid ${accent}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 48,
            transform: `scale(${pulse})`,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        {/* Text */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            fontFamily,
            color: DESIGN.text,
            lineHeight: 1.3,
          }}
        >
          {text}
        </div>
      </div>
      {/* Feature number */}
      <div
        style={{
          position: "absolute",
          top: DESIGN.safePadding.top,
          right: DESIGN.safePadding.sides * 2,
          fontSize: 120,
          fontWeight: 900,
          fontFamily,
          color: `${accent}15`,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};

const StatScene: React.FC<{
  number: string;
  label: string;
  accent: string;
}> = ({ number, label, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 6, stiffness: 120 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 160,
          fontWeight: 900,
          fontFamily,
          color: accent,
          transform: `scale(${scale})`,
          textShadow: `0 0 80px ${accent}60`,
        }}
      >
        {number}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 500,
          fontFamily,
          color: DESIGN.textMuted,
          marginTop: 10,
          opacity: interpolate(frame, [15, 25], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

const CTAScene: React.FC<{
  cta: string;
  brandName: string;
  tagline: string;
  accent: string;
  logo: string;
}> = ({ cta, brandName, tagline, accent, logo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontSize: 80,
          transform: `scale(${entrance})`,
        }}
      >
        {logo}
      </div>
      {/* Brand name */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          fontFamily,
          color: DESIGN.text,
          opacity: entrance,
        }}
      >
        {brandName}
      </div>
      {/* Tagline */}
      <div
        style={{
          fontSize: 28,
          fontFamily,
          color: DESIGN.textMuted,
          opacity: interpolate(frame, [10, 20], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {tagline}
      </div>
      {/* CTA button */}
      <div
        style={{
          marginTop: 40,
          padding: "20px 50px",
          backgroundColor: accent,
          borderRadius: 16,
          fontSize: 32,
          fontWeight: 700,
          fontFamily,
          color: DESIGN.text,
          opacity: interpolate(frame, [20, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
          transform: `translateY(${interpolate(frame, [20, 30], [20, 0], { extrapolateRight: "clamp" })}px)`,
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

const SCENE_DURATION = 90; // 3 seconds per scene at 30fps

export const PromoProduct: React.FC<PromoProductProps> = ({
  brand,
  hook,
  features,
  stat,
  cta,
}) => {
  const brandConfig = BRANDS[brand];
  const accent = brandConfig.accent;

  // Limit to 3 features max
  const displayFeatures = features.slice(0, 3);

  return (
    <AbsoluteFill style={{ backgroundColor: DESIGN.bg }}>
      {/* Scene 1: Hook */}
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <HookScene text={hook} accent={accent} />
      </Sequence>

      {/* Scene 2-4: Features */}
      {displayFeatures.map((feature, i) => (
        <Sequence
          key={`feature-${i}`}
          from={SCENE_DURATION + i * SCENE_DURATION}
          durationInFrames={SCENE_DURATION}
        >
          <FeatureScene
            text={feature.text}
            icon={feature.icon}
            accent={accent}
            index={i}
          />
        </Sequence>
      ))}

      {/* Scene 5: Big stat */}
      <Sequence
        from={SCENE_DURATION + displayFeatures.length * SCENE_DURATION}
        durationInFrames={SCENE_DURATION}
      >
        <StatScene number={stat.number} label={stat.label} accent={accent} />
      </Sequence>

      {/* Scene 6: CTA */}
      <Sequence
        from={
          SCENE_DURATION + (displayFeatures.length + 1) * SCENE_DURATION
        }
        durationInFrames={SCENE_DURATION}
      >
        <CTAScene
          cta={cta}
          brandName={brandConfig.name}
          tagline={brandConfig.tagline}
          accent={accent}
          logo={brandConfig.logo}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
