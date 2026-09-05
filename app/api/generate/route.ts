import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 30;

const PROMPTS: Record<string, string> = {
  html: "Eres un experto maquetador HTML/CSS. Convierte la captura en HTML + CSS puro (sin Tailwind). Devuelve SOLO código HTML completo y limpio, sin explicaciones, sin markdown.",
  "html-tailwind": "Eres un experto en HTML + Tailwind CSS. Convierte la captura en HTML usando Tailwind CDN (añade <script src='https://cdn.tailwindcss.com'></script> si hace falta). Devuelve SOLO código HTML completo, sin explicaciones, sin markdown. Pixel-perfect, responsive.",
  react: "Eres un experto en React + Tailwind. Convierte la captura en un componente React funcional (export default function). Usa Tailwind. Devuelve SOLO código TSX, sin explicaciones, sin markdown.",
  vue: "Eres un experto en Vue 3 + Tailwind. Convierte la captura en un SFC Vue (<template><script setup>). Devuelve SOLO código Vue, sin explicaciones.",
};

export async function POST(req: Request) {
  try {
    const { image, format } = await req.json();
    if (!image) return Response.json({ error: "Falta imagen" }, { status: 400 });
    const f = (format as string) || "html-tailwind";
    const prompt = PROMPTS[f] || PROMPTS["html-tailwind"];

    // Intento 1: Gemini Flash (gratis)
    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY");
      const { text } = await generateText({
        model: google("gemini-2.0-flash"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: image as string },
            ],
          },
        ],
      });
      const code = text.replace(/^```(html|tsx|vue)?\n?/, "").replace(/```$/, "").trim();
      return Response.json({ code });
    } catch (e: any) {
      console.error("Gemini fallo, probando fallback:", e.message);
      // Fallback open-source: puedes conectar HuggingFace Inference aquí
      // Ejemplo con HF: https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf
      // Por ahora devolvemos error amigable para que configures HF_TOKEN
      if (process.env.HF_TOKEN) {
        // Aquí iría fetch a HF — placeholder
        return Response.json({ error: "Gemini sin cuota, activa HF_TOKEN para fallback open-source. Error: " + e.message }, { status: 429 });
      }
      throw e;
    }
  } catch (e: any) {
    return Response.json({ error: e.message || "Error generando código" }, { status: 500 });
  }
}
