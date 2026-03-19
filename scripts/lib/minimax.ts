/**
 * MiniMax API client for image generation, TTS, and music.
 * Docs: https://platform.minimax.io/docs
 */

import fs from "node:fs";
import path from "node:path";

const MINIMAX_BASE = "https://api.minimax.io/v1";

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return key;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Image Generation (Image-01)
// ---------------------------------------------------------------------------

interface ImageGenerationRequest {
  prompt: string;
  /** Aspect ratio: "9:16" for vertical, "16:9" for horizontal, "1:1" for square. */
  aspectRatio?: string;
}

interface ImageGenerationResponse {
  data: { image_base64: string[] };
  base_resp: { status_code: number; status_msg: string };
}

/**
 * Generate an image from a text prompt using MiniMax Image-01.
 * Returns the path to the saved JPEG file.
 */
export async function generateImage(
  prompt: string,
  outputPath: string,
  aspectRatio = "9:16",
): Promise<string> {
  const body: ImageGenerationRequest & { model: string; response_format: string; aspect_ratio: string } = {
    model: "image-01",
    prompt,
    aspect_ratio: aspectRatio,
    response_format: "base64",
  };

  const res = await fetch(`${MINIMAX_BASE}/image_generation`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiniMax Image API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as ImageGenerationResponse;
  if (json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax Image API: ${json.base_resp.status_msg}`);
  }

  const imageData = json.data.image_base64[0];
  if (!imageData) {
    throw new Error("MiniMax Image API returned no images");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(imageData, "base64"));
  console.log(`  Image saved: ${outputPath}`);
  return outputPath;
}

// ---------------------------------------------------------------------------
// Text-to-Speech (Speech 2.8-HD)
// ---------------------------------------------------------------------------

interface T2ARequest {
  model: string;
  text: string;
  voice_setting: {
    voice_id: string;
    speed: number;
    vol: number;
    pitch: number;
  };
  audio_setting: {
    sample_rate: number;
    bitrate: number;
    format: string;
  };
}

interface T2AResponse {
  data: { audio: string };
  extra_info: {
    audio_length: number;
    audio_sample_rate: number;
    audio_size: number;
  };
  base_resp: { status_code: number; status_msg: string };
}

/**
 * Generate voiceover audio from text using MiniMax Speech 2.8-HD.
 * Returns the path to the saved MP3 file and the audio duration in ms.
 */
export async function generateVoiceover(
  text: string,
  outputPath: string,
  voiceId = "male-qn-qingse",
): Promise<{ path: string; durationMs: number }> {
  const body: T2ARequest = {
    model: "speech-2.8-hd",
    text,
    voice_setting: {
      voice_id: voiceId,
      speed: 1.0,
      vol: 1.0,
      pitch: 0,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
    },
  };

  const res = await fetch(`${MINIMAX_BASE}/t2a_v2`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiniMax T2A API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as T2AResponse;
  if (json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax T2A API: ${json.base_resp.status_msg}`);
  }

  // T2A returns hex-encoded audio data.
  const audioBuffer = Buffer.from(json.data.audio, "hex");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, audioBuffer);

  const durationMs = json.extra_info.audio_length;
  console.log(`  Voiceover saved: ${outputPath} (${(durationMs / 1000).toFixed(1)}s)`);
  return { path: outputPath, durationMs };
}

// ---------------------------------------------------------------------------
// Music Generation (Music 2.5+)
// ---------------------------------------------------------------------------

interface MusicRequest {
  model: string;
  prompt: string;
  is_instrumental: boolean;
  output_format: string;
  audio_setting: {
    sample_rate: number;
    bitrate: number;
    format: string;
  };
}

interface MusicResponse {
  data: { audio: string; status: number };
  extra_info: {
    music_duration: number;
    music_sample_rate: number;
    music_size: number;
  };
  base_resp: { status_code: number; status_msg: string };
}

/**
 * Generate instrumental background music using MiniMax Music 2.5+.
 * Returns the path to the saved MP3 file and the duration in ms.
 */
export async function generateMusic(
  prompt: string,
  outputPath: string,
): Promise<{ path: string; durationMs: number }> {
  const body: MusicRequest = {
    model: "music-2.5+",
    prompt,
    is_instrumental: true,
    output_format: "hex",
    audio_setting: {
      sample_rate: 44100,
      bitrate: 256000,
      format: "mp3",
    },
  };

  const res = await fetch(`${MINIMAX_BASE}/music_generation`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MiniMax Music API error ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as MusicResponse;
  if (json.base_resp.status_code !== 0) {
    throw new Error(`MiniMax Music API: ${json.base_resp.status_msg}`);
  }

  const audioBuffer = Buffer.from(json.data.audio, "hex");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, audioBuffer);

  const durationMs = json.extra_info.music_duration;
  console.log(`  Music saved: ${outputPath} (${(durationMs / 1000).toFixed(1)}s)`);
  return { path: outputPath, durationMs };
}
