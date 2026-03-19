# Remotion Factory

AI video factory adapted from Remotion's official [`template-prompt-to-video`](https://github.com/remotion-dev/template-prompt-to-video). Replaces OpenAI + ElevenLabs with **MiniMax + Groq** APIs.

Reads `VideoStoryboard` JSON from the [Agno/NEXUS](https://github.com/aikapenelope/Agno) Scriptwriter agent and renders it into MP4 video.

## What changed from the original template

| Component | Original template | This fork |
|---|---|---|
| **Script generation** | OpenAI GPT-4.1 | Agno Scriptwriter (reads JSON file) |
| **Image generation** | OpenAI DALL-E 3 | MiniMax Image-01 |
| **Voiceover / TTS** | ElevenLabs | MiniMax Speech 2.8-HD |
| **Caption timestamps** | ElevenLabs character alignment | Groq Whisper word-level timestamps |
| **Background music** | None | MiniMax Music 2.5+ (new) |
| **Remotion compositions** | Unchanged | Unchanged (+ background music Audio) |

The Remotion rendering layer (AIVideo, Background, Subtitle, Word components) is preserved from the original template. Only the asset generation pipeline (`cli/service.ts`) and CLI (`cli/cli.ts`) were modified.

## Setup

```bash
git clone https://github.com/aikapenelope/remotion-factory.git
cd remotion-factory
npm install
cp .env.example .env
# Edit .env with your API keys
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MINIMAX_API_KEY` | Yes | MiniMax platform API key |
| `GROQ_API_KEY` | Yes | Groq API key (Whisper) |
| `VOICE_ID` | No | MiniMax voice ID (default: `male-qn-qingse`) |

## Usage

### 1. Get a VideoStoryboard JSON

The Agno Scriptwriter agent saves these to `~/nexus-videos/public/content/<slug>.json`. A sample is included at `public/content/sample.json`.

### 2. Generate assets

```bash
npm run gen -- --input public/content/sample.json
```

This calls MiniMax + Groq APIs to produce:
- Images per scene (MiniMax Image-01, 9:16 vertical)
- Voiceover per scene (MiniMax Speech 2.8-HD)
- Word-level captions (Groq Whisper)
- Background music (MiniMax Music 2.5+)
- Timeline JSON for Remotion

### 3. Preview

```bash
npm run dev
```

### 4. Render

```bash
npx remotion render <slug> out/<slug>.mp4
```

## Project Structure

```
remotion-factory/
├── cli/
│   ├── cli.ts          # CLI entry point (reads VideoStoryboard JSON)
│   ├── service.ts      # MiniMax + Groq API clients
│   └── timeline.ts     # Converts story data to Remotion timeline
├── src/
│   ├── components/
│   │   ├── AIVideo.tsx     # Main composition (from original template)
│   │   ├── Background.tsx  # Background image with Ken Burns (original)
│   │   ├── Subtitle.tsx    # Subtitle rendering (original)
│   │   └── Word.tsx        # Word rendering with animation (original)
│   ├── lib/
│   │   ├── constants.ts    # FPS, aspect ratio config
│   │   ├── types.ts        # Timeline + content types
│   │   └── utils.ts        # Frame timing, path helpers
│   ├── Root.tsx            # Remotion root (original)
│   └── index.ts            # Entry point (original)
├── public/content/         # VideoStoryboard JSON + generated assets
├── .env.example
└── package.json
```

## License

Apache 2.0 (this fork). Original template: [Remotion license](https://remotion.dev/license).
