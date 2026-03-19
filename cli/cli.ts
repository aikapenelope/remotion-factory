#!/usr/bin/env node
/**
 * CLI for Remotion Factory.
 *
 * Reads a VideoStoryboard JSON (from Agno Scriptwriter) and generates
 * all assets: images (MiniMax), voiceover (MiniMax), captions (Groq Whisper),
 * and background music (MiniMax). Outputs a timeline.json for Remotion.
 *
 * Usage:
 *   npx tsx cli/cli.ts generate --input public/content/sample.json
 *   npm run gen -- generate --input public/content/sample.json
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import ora from "ora";
import chalk from "chalk";
import * as dotenv from "dotenv";
import {
  generateAiImage,
  generateVoice,
  generateMusic,
  transcribeForTimestamps,
} from "./service";
import {
  ContentItemWithDetails,
  StoryMetadataWithDetails,
} from "../src/lib/types";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { createTimeLineFromStoryWithDetails } from "./timeline";
import type { Timeline } from "../src/lib/types";

dotenv.config({ quiet: true });

/** VideoStoryboard JSON schema from Agno Scriptwriter. */
interface VideoScene {
  text: string;
  visual: string;
  duration_seconds: number;
  transition: string;
}

interface VideoStoryboard {
  title: string;
  hook: string;
  language: string;
  total_duration_seconds: number;
  scenes: VideoScene[];
  hashtags: string[];
  cta: string;
  platform: string;
  style: {
    font: string;
    primary_color: string;
    accent_color: string;
  };
}

interface GenerateOptions {
  input?: string;
}

class ContentFS {
  title: string;
  slug: string;

  constructor(title: string) {
    this.title = title;
    this.slug = this.getSlug();
  }

  saveDescriptor(descriptor: StoryMetadataWithDetails) {
    const dirPath = this.getDir();
    const filePath = path.join(dirPath, "descriptor.json");
    fs.writeFileSync(filePath, JSON.stringify(descriptor, null, 2));
  }

  saveTimeline(timeline: Timeline) {
    const dirPath = this.getDir();
    const filePath = path.join(dirPath, "timeline.json");
    fs.writeFileSync(filePath, JSON.stringify(timeline, null, 2));
  }

  getDir(dir?: string): string {
    const segments = ["public", "content", this.slug];
    if (dir) {
      segments.push(dir);
    }
    const p = path.join(process.cwd(), ...segments);
    fs.mkdirSync(p, { recursive: true });
    return p;
  }

  getImagePath(uid: string): string {
    const dirPath = this.getDir("images");
    return path.join(dirPath, `${uid}.png`);
  }

  getAudioPath(uid: string): string {
    const dirPath = this.getDir("audio");
    return path.join(dirPath, `${uid}.mp3`);
  }

  getMusicPath(): string {
    const dirPath = this.getDir("audio");
    return path.join(dirPath, "background-music.mp3");
  }

  getSlug(): string {
    return this.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}

async function generateFromStoryboard(options: GenerateOptions) {
  try {
    // --- Validate env vars ---
    if (!process.env.MINIMAX_API_KEY) {
      console.log(chalk.red("MINIMAX_API_KEY is required. Set it in .env"));
      process.exit(1);
    }
    if (!process.env.GROQ_API_KEY) {
      console.log(chalk.red("GROQ_API_KEY is required. Set it in .env"));
      process.exit(1);
    }

    // --- Load storyboard JSON ---
    let inputPath = options.input;
    if (!inputPath) {
      console.log(chalk.red("--input <path> is required"));
      process.exit(1);
    }

    if (!fs.existsSync(inputPath)) {
      console.log(chalk.red(`File not found: ${inputPath}`));
      process.exit(1);
    }

    const raw = fs.readFileSync(inputPath, "utf-8");
    const storyboard: VideoStoryboard = JSON.parse(raw);

    console.log(chalk.blue(`\nTitle: "${storyboard.title}"`));
    console.log(chalk.blue(`Scenes: ${storyboard.scenes.length}`));
    console.log(
      chalk.blue(`Duration: ${storyboard.total_duration_seconds}s\n`),
    );

    // --- Convert storyboard to the template's internal format ---
    const storyWithDetails: StoryMetadataWithDetails = {
      shortTitle: storyboard.title,
      content: [],
    };

    for (const scene of storyboard.scenes) {
      const contentWithDetails: ContentItemWithDetails = {
        text: scene.text,
        imageDescription: scene.visual,
        uid: uuidv4(),
        audioTimestamps: {
          characters: [],
          characterStartTimesSeconds: [],
          characterEndTimesSeconds: [],
        },
      };
      storyWithDetails.content.push(contentWithDetails);
    }

    const contentFs = new ContentFS(storyboard.title);
    contentFs.saveDescriptor(storyWithDetails);

    // --- Generate images + voiceover + captions ---
    const totalSteps = storyWithDetails.content.length * 3; // image + voice + transcribe
    const imagesSpinner = ora("Generating assets...").start();

    for (let i = 0; i < storyWithDetails.content.length; i++) {
      const storyItem = storyWithDetails.content[i];
      const step = i * 3;

      // Image
      imagesSpinner.text = `[${step + 1}/${totalSteps}] Image: ${storyItem.imageDescription.slice(0, 50)}...`;
      await generateAiImage({
        prompt: storyItem.imageDescription,
        path: contentFs.getImagePath(storyItem.uid),
        onRetry: (attempt) => {
          imagesSpinner.text = `[${step + 1}/${totalSteps}] Image (retry ${attempt})...`;
        },
      });

      // Voiceover
      imagesSpinner.text = `[${step + 2}/${totalSteps}] Voice: "${storyItem.text.slice(0, 50)}..."`;
      const audioPath = contentFs.getAudioPath(storyItem.uid);
      await generateVoice(storyItem.text, "", audioPath);

      // Transcribe for timestamps
      imagesSpinner.text = `[${step + 3}/${totalSteps}] Transcribing scene ${i + 1}...`;
      const timings = await transcribeForTimestamps(
        audioPath,
        storyItem.text,
        storyboard.language,
      );
      storyItem.audioTimestamps = timings;
    }

    contentFs.saveDescriptor(storyWithDetails);
    imagesSpinner.succeed(chalk.green("Assets generated!"));

    // --- Background music ---
    const musicSpinner = ora("Generating background music...").start();
    await generateMusic(
      "Corporate tech, modern, uplifting, clean, background music for a promotional video, subtle electronic beats, inspiring, professional",
      contentFs.getMusicPath(),
    );
    musicSpinner.succeed(chalk.green("Background music generated!"));

    // --- Build timeline ---
    const finalSpinner = ora("Building timeline...").start();
    const timeline = createTimeLineFromStoryWithDetails(storyWithDetails);
    contentFs.saveTimeline(timeline);
    finalSpinner.succeed(chalk.green("Timeline generated!"));

    console.log(chalk.green.bold("\nDone!\n"));
    console.log("Preview: " + chalk.blue("npm run dev"));
    console.log(
      "Render:  " +
        chalk.blue(
          `npx remotion render ${contentFs.slug} out/${contentFs.slug}.mp4`,
        ),
    );
    console.log();

    return {};
  } catch (error) {
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    "generate",
    "Generate video assets from a VideoStoryboard JSON",
    (yargs) => {
      return yargs.option("input", {
        alias: "i",
        type: "string",
        description: "Path to VideoStoryboard JSON file",
        demandOption: true,
      });
    },
    async (argv) => {
      await generateFromStoryboard({ input: argv.input });
    },
  )
  .command(
    "$0",
    "Generate video assets (default command)",
    (yargs) => {
      return yargs.option("input", {
        alias: "i",
        type: "string",
        description: "Path to VideoStoryboard JSON file",
        demandOption: true,
      });
    },
    async (argv) => {
      await generateFromStoryboard({ input: argv.input });
    },
  )
  .demandCommand(0, 1)
  .help()
  .alias("help", "h")
  .version()
  .alias("version", "v")
  .strict()
  .parse();
