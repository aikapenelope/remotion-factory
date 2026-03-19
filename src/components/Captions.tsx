/**
 * Word-level caption renderer.
 * Highlights the current word based on Groq Whisper timestamps.
 */

import React from "react";
import { useCurrentFrame } from "remotion";
import { VIDEO_CONFIG } from "../lib/constants";
import type { WordTimestamp } from "../lib/schema";

interface CaptionsProps {
  words: WordTimestamp[];
  /** Offset in frames from the start of the composition to this scene. */
  sceneStartFrame: number;
  style: {
    font: string;
    primaryColor: string;
    accentColor: string;
  };
}

/**
 * Renders captions with the current word highlighted.
 * Groups words into lines of ~6 words for readability on vertical video.
 */
export const Captions: React.FC<CaptionsProps> = ({
  words,
  sceneStartFrame,
  style,
}) => {
  const frame = useCurrentFrame();
  const currentTime = (frame - sceneStartFrame) / VIDEO_CONFIG.fps;

  // Find the index of the currently spoken word.
  let activeWordIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (currentTime >= words[i].start && currentTime <= words[i].end) {
      activeWordIndex = i;
      break;
    }
    // If between words, highlight the last spoken word.
    if (
      currentTime > words[i].end &&
      (i + 1 >= words.length || currentTime < words[i + 1].start)
    ) {
      activeWordIndex = i;
    }
  }

  // Group words into lines of ~6 for vertical video readability.
  const WORDS_PER_LINE = 6;
  const lines: WordTimestamp[][] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
    lines.push(words.slice(i, i + WORDS_PER_LINE));
  }

  // Find which line contains the active word.
  let activeLineIndex = 0;
  let wordCounter = 0;
  for (let i = 0; i < lines.length; i++) {
    if (
      activeWordIndex >= wordCounter &&
      activeWordIndex < wordCounter + lines[i].length
    ) {
      activeLineIndex = i;
      break;
    }
    wordCounter += lines[i].length;
  }

  // Show only the active line (karaoke-style).
  const activeLine = lines[activeLineIndex] ?? [];
  const lineStartIndex =
    lines.slice(0, activeLineIndex).reduce((sum, l) => sum + l.length, 0);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: 40,
        right: 40,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {activeLine.map((word, i) => {
        const globalIndex = lineStartIndex + i;
        const isActive = globalIndex === activeWordIndex;
        const isPast = globalIndex < activeWordIndex;

        return (
          <span
            key={`${globalIndex}-${word.word}`}
            style={{
              fontFamily: `${style.font}, sans-serif`,
              fontSize: 52,
              fontWeight: 800,
              color: isActive
                ? style.accentColor
                : isPast
                  ? "#ffffff"
                  : "rgba(255, 255, 255, 0.5)",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
              transform: isActive ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.1s",
              lineHeight: 1.3,
            }}
          >
            {word.word}
          </span>
        );
      })}
    </div>
  );
};
