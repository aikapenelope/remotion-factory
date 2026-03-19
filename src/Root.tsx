import { Composition } from "remotion";
import { VideoComposition } from "./components/VideoComposition";
import { videoFactorySchema } from "./lib/composition-schema";
import { VIDEO_CONFIG } from "./lib/constants";

/**
 * Remotion Root: registers all compositions available for rendering.
 * The main composition reads a VideoStoryboard JSON and renders scenes.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoFactory"
      component={VideoComposition}
      durationInFrames={VIDEO_CONFIG.defaultDurationFrames}
      fps={VIDEO_CONFIG.fps}
      width={VIDEO_CONFIG.width}
      height={VIDEO_CONFIG.height}
      schema={videoFactorySchema}
      defaultProps={{
        storyboardPath: "content/sample.json",
      }}
    />
  );
};
