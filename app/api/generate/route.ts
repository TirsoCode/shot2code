import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 30;

const PROMPTS: Record<string, string> = {
  html: "Eres un experto maquetador HTML/CSS. Convierte la captura en HTML + CSS puro (sin Tailwind). Devuelve SOLO código HTML completo y limpio, sin explicaciones, sin markdown.",
  "html-tailwind": "Eres un experto en HTML + Tailwind CSS. Convierte la captura en HTML usando Tailwind CDN (añade <script src='https://cdn.tailwindcss.com'></script> si hace falta). Devuelve SOLO código HTML completo, sin explicaciones, sin markdown. Pixel-perfect, responsive.",
  react: "Eres un experto en React + Tailwind. Convierte la captura en un componente React funcional (export default function). Usa Tailwind. Devuelve SOLO código TSX, sin explicaciones, sin markdown.",
  vue: "Eres un experto en Vue 3 + Tailwind. Convierte la captura en un SFC Vue (<template><script setup>). Devuelve SOLO código Vue, sin explicaciones.",
};

async function callOpenRouter(image: string, prompt: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Falta OPENROUTER_API_KEY");
  // Modelo visión barato y bueno via OpenRouter
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
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
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0,300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return text.replace(/^```(html|tsx|vue)?\n?/, "").replace(/```$/, "").trim();
}

async function callGemini(image: string, prompt: string) {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY");
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
  return text.replace(/^```(html|tsx|vue)?\n?/, "").replace(/```$/, "").trim();
}

export async function POST(req: Request) {
  try {
    const { image, format } = await req.json();
    if (!image) return Response.json({ error: "Falta imagen" }, { status: 400 });
    const f = (format as string) || "html-tailwind";
    const prompt = PROMPTS[f] || PROMPTS["html-tailwind"];

    // Intento 1: OpenRouter (tu key sk-or-v1-...)
    try {
      const code = await callOpenRouter(image, prompt);
      return Response.json({ code, provider: "openrouter" });
    } catch (e: any) {
      console.error("OpenRouter fallo, probando Gemini fallback:", e.message);
      // Intento 2: Gemini directo (AQ.Ab8...)
      try {
        const code = await callGemini(image, prompt);
        return Response.json({ code, provider: "gemini" });
      } catch (e2: any) {
        return Response.json({ error: `OpenRouter y Gemini fallaron: ${e.message} | ${e2.message}` }, { status: 500 });
      }
    }
  } catch (e: any) {
    return Response.json({ error: e.message || "Error generando código" }, { status: 500 });
  }
}
