/**
 * Main video composition.
 *
 * Reads an AssetManifest JSON (produced by the generate pipeline) and
 * assembles all scenes with their images, voiceover audio, word-level
 * captions, and background music into a single Remotion composition.
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Scene } from "./Scene";
import type { AssetManifest } from "../lib/schema";
import type { VideoCompositionProps } from "../lib/composition-schema";

/**
 * Fallback composition shown when no manifest is loaded yet
 * (e.g. in Remotion Studio before running the generate pipeline).
 */
const Placeholder: React.FC<{ message: string }> = ({ message }) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#1a1a2e",
      justifyContent: "center",
      alignItems: "center",
      padding: 60,
    }}
  >
    <p
      style={{
        color: "#e94560",
        fontSize: 48,
        fontFamily: "Inter, sans-serif",
        fontWeight: 800,
        textAlign: "center",
        margin: 0,
      }}
    >
      Remotion Factory
    </p>
    <p
      style={{
        color: "rgba(255,255,255,0.5)",
        fontSize: 28,
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
        marginTop: 24,
      }}
    >
      {message}
    </p>
  </AbsoluteFill>
);

/**
 * Loads the asset manifest from public/ at render time.
 * Returns null if the file doesn't exist yet (studio preview mode).
 */
function useManifest(manifestPath: string): AssetManifest | null {
  const [manifest, setManifest] = React.useState<AssetManifest | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = staticFile(manifestPath);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: AssetManifest) => setManifest(data))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      });
  }, [manifestPath]);

  if (error) {
    console.warn(`Failed to load manifest ${manifestPath}: ${error}`);
  }
  return manifest;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  storyboardPath,
}) => {
  const { fps } = useVideoConfig();

  // The manifest is saved alongside the storyboard: content/<slug>-manifest.json
  const manifestPath = storyboardPath.replace(".json", "-manifest.json");
  const manifest = useManifest(manifestPath);

  if (!manifest) {
    return (
      <Placeholder
        message={`Run "npm run generate -- ${storyboardPath}" to produce assets`}
      />
    );
  }

  const { storyboard, scenes: sceneAssets, musicPath } = manifest;
  const style = storyboard.style;

  // Calculate frame durations per scene.
  // Prefer actual audio duration; fall back to storyboard duration_seconds.
  const sceneFrames = sceneAssets.map((sa) => {
    const durationSec =
      sa.audioDurationMs > 0
        ? sa.audioDurationMs / 1000
        : storyboard.scenes[sa.index].duration_seconds;
    return Math.ceil(durationSec * fps);
  });

  // Build cumulative frame offsets.
  const frameOffsets: number[] = [];
  let cumulativeFrames = 0;
  for (const frames of sceneFrames) {
    frameOffsets.push(cumulativeFrames);
    cumulativeFrames += frames;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: style.primary_color }}>
      {/* Background music (loops if shorter than video, reduced volume) */}
      {musicPath && (
        <Audio src={staticFile(musicPath)} volume={0.15} loop />
      )}

      {/* Scenes rendered as Sequences */}
      {sceneAssets.map((sa, i) => {
        const scene = storyboard.scenes[sa.index];
        if (!scene) return null;

        const from = frameOffsets[i];
        const duration = sceneFrames[i];

        return (
          <Sequence key={sa.index} from={from} durationInFrames={duration}>
            {/* Per-scene voiceover audio */}
            {sa.audioPath && (
              <Audio src={staticFile(sa.audioPath)} volume={1} />
            )}

            {/* Scene visuals + captions */}
            <Scene
              scene={scene}
              imagePath={staticFile(sa.imagePath)}
              words={sa.words}
              sceneStartFrame={0}
              durationInFrames={duration}
              style={style}
              isFirst={i === 0}
              isLast={i === sceneAssets.length - 1}
              cta={i === sceneAssets.length - 1 ? storyboard.cta : undefined}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
