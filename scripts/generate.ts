#!/usr/bin/env npx tsx
/**
 * generate.ts -- Full asset generation pipeline.
 *
 * Reads a VideoStoryboard JSON (produced by the Agno Scriptwriter agent),
 * generates all assets via MiniMax + Groq APIs, writes an AssetManifest
 * JSON that Remotion consumes at render time.
 *
 * Usage:
 *   npx tsx scripts/generate.ts content/sample.json
 *   npm run generate -- content/sample.json
 *
 * Environment variables required:
 *   MINIMAX_API_KEY  -- MiniMax platform key (images, TTS, music)
 *   GROQ_API_KEY     -- Groq key (Whisper transcription for captions)
 *
 * Optional:
 *   VOICE_ID         -- MiniMax voice ID (default: "male-qn-qingse")
 *   SKIP_IMAGES      -- "true" to skip image generation (reuse existing)
 *   SKIP_MUSIC       -- "true" to skip music generation (reuse existing)
 */

import fs from "node:fs";
import path from "node:path";
import { VideoStoryboardSchema } from "../src/lib/schema";
import type { AssetManifest, SceneAssets, WordTimestamp } from "../src/lib/schema";
import { generateImage, generateVoiceover, generateMusic } from "./lib/minimax";
import { transcribeAudio, saveTranscription } from "./lib/groq-whisper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");

/** Resolve a path relative to public/. */
function pub(...segments: string[]): string {
  return path.join(PUBLIC_DIR, ...segments);
}

/** Convert a title to a URL-safe slug. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Sleep for ms milliseconds (rate-limit courtesy). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // --- Parse CLI args ---
  const storyboardRelPath = process.argv[2];
  if (!storyboardRelPath) {
    console.error("Usage: npx tsx scripts/generate.ts <path-to-storyboard.json>");
    console.error("  Path is relative to public/ (e.g. content/sample.json)");
    process.exit(1);
  }

  const storyboardAbsPath = pub(storyboardRelPath);
  if (!fs.existsSync(storyboardAbsPath)) {
    console.error(`Storyboard not found: ${storyboardAbsPath}`);
    process.exit(1);
  }

  // --- Load and validate storyboard ---
  console.log(`\n=== Remotion Factory: Asset Generation ===\n`);
  console.log(`Storyboard: ${storyboardRelPath}`);

  const raw = JSON.parse(fs.readFileSync(storyboardAbsPath, "utf-8"));
  const storyboard = VideoStoryboardSchema.parse(raw);
  const slug = slugify(storyboard.title);

  console.log(`Title: ${storyboard.title}`);
  console.log(`Slug: ${slug}`);
  console.log(`Scenes: ${storyboard.scenes.length}`);
  console.log(`Duration: ${storyboard.total_duration_seconds}s`);
  console.log();

  const voiceId = process.env.VOICE_ID ?? "male-qn-qingse";
  const skipImages = process.env.SKIP_IMAGES === "true";
  const skipMusic = process.env.SKIP_MUSIC === "true";

  // --- Asset directories ---
  const imgDir = pub("assets", "images", slug);
  const audioDir = pub("assets", "audio", slug);
  const musicDir = pub("assets", "music");
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(musicDir, { recursive: true });

  // --- Step 1: Generate images ---
  console.log("--- Step 1/4: Generating images (MiniMax Image-01) ---");
  const imagePaths: string[] = [];
  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    const imgPath = path.join(imgDir, `scene-${String(i).padStart(2, "0")}.jpg`);
    const relPath = path.relative(PUBLIC_DIR, imgPath);

    if (skipImages && fs.existsSync(imgPath)) {
      console.log(`  [skip] ${relPath} (exists)`);
      imagePaths.push(relPath);
      continue;
    }

    console.log(`  Scene ${i + 1}/${storyboard.scenes.length}: ${scene.visual.slice(0, 60)}...`);
    await generateImage(scene.visual, imgPath, "9:16");
    imagePaths.push(relPath);

    // Rate-limit: MiniMax allows 10 RPM for image generation.
    if (i < storyboard.scenes.length - 1) {
      await sleep(6500);
    }
  }
  console.log();

  // --- Step 2: Generate voiceover ---
  console.log("--- Step 2/4: Generating voiceover (MiniMax Speech 2.8-HD) ---");
  const voiceoverResults: { relPath: string; durationMs: number }[] = [];
  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    const audioPath = path.join(audioDir, `scene-${String(i).padStart(2, "0")}.mp3`);
    const relPath = path.relative(PUBLIC_DIR, audioPath);

    console.log(`  Scene ${i + 1}/${storyboard.scenes.length}: "${scene.text.slice(0, 50)}..."`);
    const result = await generateVoiceover(scene.text, audioPath, voiceId);
    voiceoverResults.push({ relPath, durationMs: result.durationMs });

    // Small delay between TTS calls.
    if (i < storyboard.scenes.length - 1) {
      await sleep(1000);
    }
  }
  console.log();

  // --- Step 3: Transcribe voiceover for word-level captions ---
  console.log("--- Step 3/4: Transcribing for captions (Groq Whisper) ---");
  const sceneWords: WordTimestamp[][] = [];
  for (let i = 0; i < storyboard.scenes.length; i++) {
    const audioPath = path.join(audioDir, `scene-${String(i).padStart(2, "0")}.mp3`);
    const captionPath = path.join(audioDir, `scene-${String(i).padStart(2, "0")}-captions.json`);

    console.log(`  Scene ${i + 1}/${storyboard.scenes.length}`);
    const transcription = await transcribeAudio(audioPath, storyboard.language);
    saveTranscription(transcription, captionPath);
    sceneWords.push(transcription.words);

    if (i < storyboard.scenes.length - 1) {
      await sleep(500);
    }
  }
  console.log();

  // --- Step 4: Generate background music ---
  console.log("--- Step 4/4: Generating background music (MiniMax Music 2.5+) ---");
  const musicPath = path.join(musicDir, `${slug}.mp3`);
  const musicRelPath = path.relative(PUBLIC_DIR, musicPath);
  let musicDurationMs = 0;

  if (skipMusic && fs.existsSync(musicPath)) {
    console.log(`  [skip] ${musicRelPath} (exists)`);
  } else {
    const musicPrompt = [
      "Corporate tech, modern, uplifting, clean,",
      "background music for a promotional video,",
      "subtle electronic beats, inspiring, professional,",
      `${storyboard.total_duration_seconds} seconds`,
    ].join(" ");

    const result = await generateMusic(musicPrompt, musicPath);
    musicDurationMs = result.durationMs;
  }
  console.log();

  // --- Build asset manifest ---
  console.log("--- Writing asset manifest ---");
  const fps = 30;
  const sceneAssets: SceneAssets[] = storyboard.scenes.map((_, i) => ({
    index: i,
    imagePath: imagePaths[i],
    audioPath: voiceoverResults[i].relPath,
    audioDurationMs: voiceoverResults[i].durationMs,
    words: sceneWords[i],
  }));

  // Total frames = sum of all scene durations (based on actual audio length).
  const totalFrames = sceneAssets.reduce((sum, sa) => {
    const durationSec = sa.audioDurationMs > 0
      ? sa.audioDurationMs / 1000
      : storyboard.scenes[sa.index].duration_seconds;
    return sum + Math.ceil(durationSec * fps);
  }, 0);

  const manifest: AssetManifest = {
    slug,
    storyboard,
    scenes: sceneAssets,
    musicPath: musicRelPath,
    musicDurationMs,
    totalFrames,
  };

  const manifestPath = storyboardAbsPath.replace(".json", "-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const manifestRelPath = path.relative(PUBLIC_DIR, manifestPath);
  console.log(`Manifest: ${manifestRelPath}`);

  // --- Summary ---
  console.log(`\n=== Done! ===`);
  console.log(`Total frames: ${totalFrames} (${(totalFrames / fps).toFixed(1)}s at ${fps}fps)`);
  console.log();
  console.log(`Next steps:`);
  console.log(`  1. Preview in Remotion Studio:`);
  console.log(`     npm run dev`);
  console.log();
  console.log(`  2. Render the video:`);
  console.log(
    `     npx remotion render VideoFactory out/${slug}.mp4 \\`,
  );
  console.log(
    `       --props='{"storyboardPath":"${storyboardRelPath}"}' \\`,
  );
  console.log(`       --frames=0-${totalFrames - 1}`);
  console.log();
}

main().catch((err) => {
  console.error("\nPipeline failed:", err);
  process.exit(1);
});
