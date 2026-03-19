/**
 * Zod schema for the VideoFactory composition props.
 * Shared between Root.tsx (registration) and VideoComposition.tsx (component).
 */

import { z } from "zod";

export const videoFactorySchema = z.object({
  storyboardPath: z.string(),
});

export type VideoCompositionProps = z.infer<typeof videoFactorySchema>;
