import * as fs from "fs";
import { IMAGE_HEIGHT, IMAGE_WIDTH } from "../src/lib/constants";

/** Character-level alignment timestamps (compatible with the original template). */
export interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

// No OpenAI needed -- script comes from Agno Scriptwriter JSON.

export const generateAiImage = async ({
  prompt,
  path,
  onRetry,
}: {
  prompt: string;
  path: string;
  onRetry: (attempt: number) => void;
}) => {
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (!minimaxKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }

  const maxRetries = 3;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    const res = await fetch("https://api.minimax.io/v1/image_generation", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${minimaxKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt,
        aspect_ratio: `${IMAGE_WIDTH}:${IMAGE_HEIGHT}`,
        response_format: "base64",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.base_resp?.status_code !== 0) {
        lastError = new Error(
          `MiniMax Image error: ${data.base_resp?.status_msg}`,
        );
        attempt++;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 6500));
        }
        onRetry(attempt);
        continue;
      }

      const imageB64 = data.data.image_base64[0];
      if (!imageB64) {
        throw new Error("MiniMax Image API returned no images");
      }

      const buffer = Buffer.from(imageB64, "base64");
      fs.writeFileSync(path, buffer as Uint8Array);
      return;
    } else {
      lastError = new Error(
        `MiniMax Image error (attempt ${attempt + 1}): ${await res.text()}`,
      );
      attempt++;
      if (attempt < maxRetries) {
        // MiniMax allows 10 RPM; wait between retries.
        await new Promise((resolve) => setTimeout(resolve, 6500));
      }
      onRetry(attempt);
    }
  }

  // Ran out of retries, throw the last error
  throw lastError!;
};

// Prompt generation removed -- Agno Scriptwriter provides the script and
// image descriptions directly in the VideoStoryboard JSON.

/**
 * Generate voiceover audio using MiniMax Speech 2.8-HD.
 * Returns the audio duration in milliseconds.
 * Character-level timestamps are obtained separately via Groq Whisper.
 */
export const generateVoice = async (
  text: string,
  _apiKey: string,
  filePath: string,
): Promise<{ durationMs: number }> => {
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (!minimaxKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }

  const voiceId = process.env.VOICE_ID ?? "male-qn-qingse";

  const res = await fetch("https://api.minimax.io/v1/t2a_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${minimaxKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MiniMax T2A error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax T2A error: ${data.base_resp?.status_msg}`);
  }

  // MiniMax T2A returns hex-encoded audio.
  const audioBuffer = Buffer.from(data.data.audio, "hex");
  fs.writeFileSync(filePath, audioBuffer as Uint8Array);

  return { durationMs: data.extra_info.audio_length };
};

/**
 * Transcribe audio using Groq Whisper for word-level timestamps.
 * Converts word timestamps to character-level alignment for timeline compatibility.
 */
export const transcribeForTimestamps = async (
  audioPath: string,
  text: string,
  language = "es",
): Promise<CharacterAlignment> => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }

  const audioBuffer = fs.readFileSync(audioPath);
  const fileName = audioPath.split("/").pop() ?? "audio.mp3";

  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer]), fileName);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", language);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Whisper error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const words: { word: string; start: number; end: number }[] =
    data.words ?? [];

  // Convert word-level timestamps to character-level alignment.
  // Each character in a word gets the same start/end time as the word.
  const characters: string[] = [];
  const characterStartTimesSeconds: number[] = [];
  const characterEndTimesSeconds: number[] = [];

  for (const w of words) {
    for (const char of w.word) {
      characters.push(char);
      characterStartTimesSeconds.push(w.start);
      characterEndTimesSeconds.push(w.end);
    }
    // Add space between words.
    characters.push(" ");
    characterStartTimesSeconds.push(w.end);
    characterEndTimesSeconds.push(w.end);
  }

  return { characters, characterStartTimesSeconds, characterEndTimesSeconds };
};

/**
 * Generate instrumental background music using MiniMax Music 2.5+.
 * Returns the path to the saved MP3 and the duration in milliseconds.
 */
export const generateMusic = async (
  prompt: string,
  filePath: string,
): Promise<{ durationMs: number }> => {
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (!minimaxKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }

  const res = await fetch("https://api.minimax.io/v1/music_generation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${minimaxKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "music-2.5+",
      prompt,
      is_instrumental: true,
      output_format: "hex",
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MiniMax Music error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax Music error: ${data.base_resp?.status_msg}`);
  }

  const audioBuffer = Buffer.from(data.data.audio, "hex");
  fs.writeFileSync(filePath, audioBuffer as Uint8Array);

  return { durationMs: data.extra_info.music_duration };
};
