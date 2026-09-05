import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 30;

type StackId = "html" | "html-tailwind" | "react" | "vue" | "bootstrap" | "ionic";

const PROMPTS: Record<StackId, string> = {
  html:
    "Eres un experto maquetador HTML/CSS. Convierte esta captura en HTML + CSS puro (sin framework). Usa flexbox, colores, tipografía y espaciados fieles al diseño. Devuelve SOLO código HTML completo, sin explicaciones, sin markdown.",
  "html-tailwind":
    "Eres un experto en HTML + Tailwind CSS. Convierte la captura en HTML usando Tailwind CDN. Devuelve SOLO código HTML completo, sin explicaciones, sin markdown. Pixel-perfect, responsive.",
  react:
    "Eres un experto en React + Tailwind. Convierte la captura en un componente React funcional (export default function). Usa Tailwind para estilos. Devuelve SOLO código TSX, sin explicaciones, sin markdown.",
  vue:
    "Eres un experto en Vue 3 + Tailwind. Convierte la captura en un SFC Vue (<template><script setup lang='ts'>). Usa Tailwind. Devuelve SOLO código Vue, sin explicaciones, sin markdown.",
  bootstrap:
    "Eres un experto en HTML + Bootstrap 5. Convierte la captura en HTML usando Bootstrap 5 CDN (botones, cards, grid, forms, etc). Devuelve SOLO código HTML completo, sin explicaciones, sin markdown.",
  ionic:
    "Eres un experto en Ionic Framework + Tailwind. Convierte la captura en componentes Ionic (ion-header, ion-content, ion-card, etc). Devuelve SOLO código TSX para React+Ionic, sin explicaciones, sin markdown.",
};

async function callOpenRouter(image: string, prompt: string, textPrompt: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Falta OPENROUTER_API_KEY");
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
  const fullPrompt = textPrompt ? `${prompt}\n\nInstrucciones adicionales del usuario: ${textPrompt}` : prompt;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/TirsoCode/shot2code",
      "X-Title": "Shot2Code",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "")
    .replace(/^```(html|tsx|vue)?\n?/, "")
    .replace(/```$/, "")
    .trim();
}

async function callGemini(image: string, prompt: string, textPrompt: string) {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY");
  const fullPrompt = textPrompt ? `${prompt}\n\nInstrucciones adicionales: ${textPrompt}` : prompt;
  const { text } = await generateText({
    model: google("gemini-2.0-flash"),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          { type: "image", image: image as string },
        ],
      },
    ],
  });
  return text.replace(/^```(html|tsx|vue)?\n?/, "").replace(/```$/, "").trim();
}

export async function POST(req: Request) {
  try {
    const { image, stack, textPrompt, variants = 1 } = await req.json();
    if (!image) return Response.json({ error: "Falta imagen" }, { status: 400 });
    const s = ((stack as string) || "html-tailwind") as StackId;
    const prompt = PROMPTS[s] || PROMPTS["html-tailwind"];
    const count = Math.min(Math.max(Number(variants) || 1, 1), 2);

    const runOnce = async (): Promise<{ code: string; provider: string }> => {
      // Intento 1: OpenRouter
      try {
        const code = await callOpenRouter(image, prompt, textPrompt || "");
        return { code, provider: "openrouter" };
      } catch (e: any) {
        console.error("OpenRouter fallo, fallback Gemini:", e.message);
        // Intento 2: Gemini
        try {
          const code = await callGemini(image, prompt, textPrompt || "");
          return { code, provider: "gemini" };
        } catch (e2: any) {
          throw new Error(`OpenRouter y Gemini fallaron: ${e.message} | ${e2.message}`);
        }
      }
    };

    const results = await Promise.all(Array.from({ length: count }, () => runOnce()));
    return Response.json({
      codes: results.map((r) => r.code),
      provider: results[0]?.provider,
    });
  } catch (e: any) {
    return Response.json({ error: e.message || "Error generando código" }, { status: 500 });
  }
}