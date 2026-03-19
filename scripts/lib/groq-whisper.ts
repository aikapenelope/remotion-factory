/**
 * Groq Whisper client for word-level transcription (captions).
 * Uses the OpenAI-compatible /audio/transcriptions endpoint.
 * Docs: https://console.groq.com/docs/speech-to-text
 */

import fs from "node:fs";
import path from "node:path";

const GROQ_BASE = "https://api.groq.com/openai/v1";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }
  return key;
}

/** A single word with its timing information. */
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

/** A segment of transcription with word-level timestamps. */
export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
}

/** Full transcription result with word-level timestamps. */
export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  words: WordTimestamp[];
  language: string;
  duration: number;
}

/**
 * Transcribe an audio file using Groq Whisper with word-level timestamps.
 * Returns structured transcription with per-word timing for caption sync.
 */
export async function transcribeAudio(
  audioPath: string,
  language = "es",
): Promise<TranscriptionResult> {
  const audioBuffer = fs.readFileSync(audioPath);
  const fileName = path.basename(audioPath);

  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer]), fileName);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", language);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      // Do NOT set Content-Type; fetch sets it with the boundary for FormData.
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Whisper API error ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as TranscriptionResult;
  console.log(
    `  Transcription: ${json.words.length} words, ${json.duration.toFixed(1)}s`,
  );
  return json;
}

/**
 * Save transcription result as a JSON file for Remotion to consume.
 */
export function saveTranscription(
  result: TranscriptionResult,
  outputPath: string,
): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`  Captions saved: ${outputPath}`);
}
