# Remotion Factory

AI video factory powered by **Remotion + MiniMax + Groq**. Reads `VideoStoryboard` JSON from the [Agno/NEXUS](https://github.com/aikapenelope/Agno) Scriptwriter agent and renders it into MP4 video.

## Stack

| Function | Provider | Model / Endpoint |
|---|---|---|
| **Images** | MiniMax | Image-01 (`/v1/image_generation`) |
| **Voiceover (TTS)** | MiniMax | Speech 2.8-HD (`/v1/t2a_v2`) |
| **Background music** | MiniMax | Music 2.5+ (`/v1/music_generation`) |
| **Captions** | Groq | Whisper Large V3 Turbo (word-level timestamps) |
| **Rendering** | Remotion | CLI / Studio (React frame-by-frame) |

No OpenAI. No ElevenLabs. Everything runs through MiniMax and Groq APIs.

## Prerequisites

- Node.js >= 18
- MiniMax API key ([platform.minimax.io](https://platform.minimax.io))
- Groq API key ([console.groq.com](https://console.groq.com))

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
| `MINIMAX_API_KEY` | Yes | MiniMax platform API key (images, TTS, music) |
| `GROQ_API_KEY` | Yes | Groq API key (Whisper transcription for captions) |
| `VOICE_ID` | No | MiniMax voice ID (default: `male-qn-qingse`) |
| `SKIP_IMAGES` | No | Set to `true` to reuse existing images |
| `SKIP_MUSIC` | No | Set to `true` to reuse existing music |

## Usage

### 1. Generate a storyboard with Agno

In the NEXUS Cerebro system, ask the Content Factory team to create a video. The Scriptwriter agent saves a `VideoStoryboard` JSON to `~/nexus-videos/public/content/<slug>.json`.

Copy that JSON into this project's `public/content/` folder, or configure the Agno `FileTools` base_dir to point here.

### 2. Generate assets

```bash
# Generate images, voiceover, music, and captions from the storyboard
npm run generate -- content/docflow-promocional.json
```

This runs the full pipeline:
1. **Images**: Generates one image per scene via MiniMax Image-01 (9:16 vertical)
2. **Voiceover**: Generates TTS audio per scene via MiniMax Speech 2.8-HD
3. **Captions**: Transcribes each voiceover with Groq Whisper for word-level timestamps
4. **Music**: Generates instrumental background music via MiniMax Music 2.5+
5. **Manifest**: Writes `<slug>-manifest.json` with all asset paths and timing data

### 3. Preview in Remotion Studio

```bash
npm run dev
```

Open the Studio in your browser. Select the `VideoFactory` composition. The storyboard path can be changed in the props panel.

### 4. Render the final video

```bash
npx remotion render VideoFactory out/docflow-promocional.mp4 \
  --props='{"storyboardPath":"content/docflow-promocional.json"}' \
  --frames=0-1049
```

The `generate` script prints the exact render command with the correct frame count.

## Project Structure

```
remotion-factory/
├── public/
│   ├── content/           # VideoStoryboard JSON files (input)
│   │   └── sample.json    # Example storyboard
│   └── assets/            # Generated assets (gitignored)
│       ├── images/        # Scene images (MiniMax Image-01)
│       ├── audio/         # Voiceover + caption JSON (MiniMax TTS + Groq Whisper)
│       └── music/         # Background music (MiniMax Music 2.5+)
├── src/
│   ├── components/
│   │   ├── VideoComposition.tsx  # Main composition (assembles scenes)
│   │   ├── Scene.tsx             # Single scene (image + text + transitions)
│   │   └── Captions.tsx          # Word-level karaoke captions
│   ├── lib/
│   │   ├── schema.ts             # VideoStoryboard Zod schema + types
│   │   ├── composition-schema.ts # Remotion composition props schema
│   │   └── constants.ts          # Video config (1080x1920, 30fps)
│   ├── Root.tsx                  # Remotion root (composition registration)
│   └── index.ts                  # Entry point
├── scripts/
│   ├── generate.ts        # CLI orchestrator (full pipeline)
│   └── lib/
│       ├── minimax.ts     # MiniMax API client (images, TTS, music)
│       └── groq-whisper.ts # Groq Whisper client (word-level captions)
└── package.json
```

## VideoStoryboard JSON Schema

This is the JSON format produced by the Agno Scriptwriter agent:

```json
{
  "title": "Video Title",
  "hook": "First 3 seconds text",
  "language": "es",
  "total_duration_seconds": 35,
  "scenes": [
    {
      "text": "Narration text in Spanish",
      "visual": "Detailed image description for AI generation",
      "duration_seconds": 5,
      "transition": "fade"
    }
  ],
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "Call to action text",
  "platform": "instagram_reels",
  "style": {
    "font": "Inter",
    "primary_color": "#1a1a2e",
    "accent_color": "#e94560"
  }
}
```

### Transition types

- `fade` -- Cross-fade in/out (default)
- `slide` -- Slide in from right
- `zoom` -- Spring-based zoom in
- `cut` -- Hard cut (instant)

## Video Specs

- **Format**: 1080x1920 (9:16 vertical) for Instagram Reels / TikTok
- **FPS**: 30
- **Captions**: Word-level karaoke style with highlight on current word
- **Music**: Instrumental, looped, mixed at 15% volume under voiceover

## Integration with Agno/NEXUS

The Scriptwriter agent in `nexus.py` uses `FileTools(base_dir=Path.home() / "nexus-videos")` to save storyboard JSON files. To connect the two projects:

**Option A**: Symlink this project as `~/nexus-videos`:
```bash
ln -s /path/to/remotion-factory ~/nexus-videos
```

**Option B**: Clone this repo as `~/nexus-videos`:
```bash
git clone https://github.com/aikapenelope/remotion-factory.git ~/nexus-videos
```

Either way, the Scriptwriter will save JSON to `public/content/<slug>.json` and you can run `npm run generate` from this directory.

## License

Apache 2.0
