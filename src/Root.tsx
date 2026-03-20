import { Composition, getStaticFiles } from "remotion";
import { AIVideo, aiVideoSchema } from "./components/AIVideo";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { getTimelinePath, loadTimelineFromFile } from "./lib/utils";
import { PromoProduct } from "./templates/PromoProduct";
import { promoProductSchema } from "./templates/PromoProduct";
import type { PromoProductProps } from "./templates/PromoProduct";
import { DESIGN } from "./templates/brand";

const SCENE_DURATION = 90; // 3s per scene at 30fps

/** Sample props for the PromoProduct template preview. */
const samplePromoProps: PromoProductProps = {
  brand: "docflow",
  hook: "Tu clinica aun usa papel?",
  features: [
    { text: "Digitaliza historias clinicas en minutos", icon: "📱" },
    { text: "Cumple regulaciones de salud automaticamente", icon: "🛡️" },
    { text: "Conecta recepcion, laboratorio y consulta", icon: "🔗" },
  ],
  stat: { number: "70%", label: "menos tiempo en papeleo" },
  cta: "Prueba Docflow gratis",
};

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
      {/* === AI Video compositions (from generate pipeline) === */}
      {timelines.map((storyName) => (
        <Composition
          id={storyName}
          component={AIVideo}
          fps={FPS}
          width={1080}
          height={1920}
          schema={aiVideoSchema}
          defaultProps={{
            timeline: null,
          }}
          calculateMetadata={async ({ props }) => {
            const { lengthFrames, timeline } = await loadTimelineFromFile(
              getTimelinePath(storyName),
            );

            return {
              durationInFrames: lengthFrames + INTRO_DURATION,
              props: {
                ...props,
                timeline,
              },
            };
          }}
        />
      ))}

      {/* === Motion Graphics templates === */}
      <Composition
        id="promo-docflow"
        component={PromoProduct}
        schema={promoProductSchema}
        fps={DESIGN.fps}
        width={DESIGN.width}
        height={DESIGN.height}
        durationInFrames={SCENE_DURATION * 6}
        defaultProps={samplePromoProps}
      />
      <Composition
        id="promo-whabi"
        component={PromoProduct}
        schema={promoProductSchema}
        fps={DESIGN.fps}
        width={DESIGN.width}
        height={DESIGN.height}
        durationInFrames={SCENE_DURATION * 6}
        defaultProps={{
          ...samplePromoProps,
          brand: "whabi" as const,
          hook: "Tus clientes te escriben por WhatsApp?",
          features: [
            { text: "CRM integrado con WhatsApp Business", icon: "💬" },
            { text: "Automatiza respuestas y seguimiento", icon: "🤖" },
            { text: "Dashboard de metricas en tiempo real", icon: "📊" },
          ],
          stat: { number: "3x", label: "mas conversiones" },
          cta: "Prueba Whabi gratis",
        }}
      />
      <Composition
        id="promo-aurora"
        component={PromoProduct}
        schema={promoProductSchema}
        fps={DESIGN.fps}
        width={DESIGN.width}
        height={DESIGN.height}
        durationInFrames={SCENE_DURATION * 6}
        defaultProps={{
          ...samplePromoProps,
          brand: "aurora" as const,
          hook: "Tu negocio necesita voz, no texto",
          features: [
            { text: "PWA voice-first con IA integrada", icon: "🎙️" },
            { text: "Transcripcion automatica con Whisper", icon: "📝" },
            { text: "Funciona offline, sin instalacion", icon: "⚡" },
          ],
          stat: { number: "10x", label: "mas rapido que escribir" },
          cta: "Prueba Aurora gratis",
        }}
      />
    </>
  );
};
