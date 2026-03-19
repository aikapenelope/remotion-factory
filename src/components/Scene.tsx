/**
 * Scene component: renders a single scene with background image,
 * text overlay, transition animation, and word-level captions.
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Captions } from "./Captions";
import type { VideoScene, VideoStyle, WordTimestamp } from "../lib/schema";

interface SceneProps {
  scene: VideoScene;
  /** Path to the generated image (relative to public/). */
  imagePath: string;
  /** Word-level timestamps for this scene's voiceover. */
  words: WordTimestamp[];
  /** Frame offset of this scene within the full composition. */
  sceneStartFrame: number;
  /** Duration of this scene in frames. */
  durationInFrames: number;
  /** Visual style from the storyboard. */
  style: VideoStyle;
  /** Whether this is the first scene (applies hook styling). */
  isFirst: boolean;
  /** Whether this is the last scene (applies CTA). */
  isLast: boolean;
  /** CTA text (only used if isLast). */
  cta?: string;
}

/**
 * Computes the entrance animation based on transition type.
 */
function useTransition(
  transition: VideoScene["transition"],
  frame: number,
  fps: number,
  durationInFrames: number,
) {
  const enterDuration = Math.min(fps * 0.5, 15); // 0.5s or 15 frames
  const exitStart = durationInFrames - enterDuration;

  // Entrance opacity (all transitions fade in).
  const enterOpacity = interpolate(frame, [0, enterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit opacity.
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const opacity = Math.min(enterOpacity, exitOpacity);

  // Transition-specific transforms.
  switch (transition) {
    case "slide": {
      const slideX = interpolate(frame, [0, enterDuration], [100, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return { opacity, transform: `translateX(${slideX}%)` };
    }
    case "zoom": {
      const scale = spring({
        frame,
        fps,
        config: { damping: 15, stiffness: 80 },
      });
      return { opacity, transform: `scale(${0.8 + 0.2 * scale})` };
    }
    case "cut":
      return {
        opacity: frame < 2 ? 0 : 1,
        transform: "none",
      };
    case "fade":
    default:
      return { opacity, transform: "none" };
  }
}

export const Scene: React.FC<SceneProps> = ({
  scene,
  imagePath,
  words,
  sceneStartFrame,
  durationInFrames,
  style,
  isFirst,
  isLast,
  cta,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, transform } = useTransition(
    scene.transition,
    frame,
    fps,
    durationInFrames,
  );

  // Subtle Ken Burns effect on the background image.
  const kenBurnsScale = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: style.primary_color }}>
      {/* Background image with Ken Burns */}
      <AbsoluteFill style={{ opacity, transform }}>
        <Img
          src={imagePath}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${kenBurnsScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Dark gradient overlay for text readability */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 100%)",
          opacity,
        }}
      />

      {/* Hook text (first scene only) */}
      {isFirst && (
        <div
          style={{
            position: "absolute",
            top: 200,
            left: 40,
            right: 40,
            opacity: interpolate(frame, [0, 15], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <p
            style={{
              fontFamily: `${style.font}, sans-serif`,
              fontSize: 64,
              fontWeight: 900,
              color: style.accent_color,
              textAlign: "center",
              textShadow: "0 4px 12px rgba(0, 0, 0, 0.9)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {scene.text}
          </p>
        </div>
      )}

      {/* CTA (last scene only) */}
      {isLast && cta && (
        <div
          style={{
            position: "absolute",
            bottom: 300,
            left: 40,
            right: 40,
            opacity: interpolate(
              frame,
              [durationInFrames * 0.3, durationInFrames * 0.5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          <p
            style={{
              fontFamily: `${style.font}, sans-serif`,
              fontSize: 40,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              backgroundColor: style.accent_color,
              padding: "16px 32px",
              borderRadius: 12,
              margin: 0,
            }}
          >
            {cta}
          </p>
        </div>
      )}

      {/* Word-level captions */}
      {words.length > 0 && (
        <Captions
          words={words}
          sceneStartFrame={sceneStartFrame}
          style={{
            font: style.font,
            primaryColor: style.primary_color,
            accentColor: style.accent_color,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
