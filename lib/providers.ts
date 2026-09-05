import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export interface GenInput {
  text: string;
  image?: string;
  editHtml?: string;
}

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const OR_MODELS = [
  "minimax/minimax-m3:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
];

function orHeaders(model: string): Record<string, string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Falta OPENROUTER_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/TirsoCode/shot2code",
    "X-Title": "Shot2Code",
  };
}

function orMessages(input: GenInput): Array<{ role: string; content: any[] }> {
  const content: any[] = [];
  if (input.text) content.push({ type: "text", text: input.text });
  if (input.editHtml) {
    content.push({
      type: "text",
      text: `CÓDIGO ACTUAL DEL ARCHIVO (modifícalo aplicando el cambio, manteniendo todo lo demás intacto):\n${input.editHtml}`,
    });
  }
  if (input.image) content.push({ type: "image_url", image_url: { url: input.image } });
  return [{ role: "user", content }];
}

function geminiMessages(input: GenInput): Array<{ role: string; content: any[] }> {
  const content: any[] = [];
  if (input.text) content.push({ type: "text", text: input.text });
  if (input.editHtml) {
    content.push({
      type: "text",
      text: `CÓDIGO ACTUAL DEL ARCHIVO:\n${input.editHtml}`,
    });
  }
  if (input.image) content.push({ type: "image", image: input.image });
  return [{ role: "user", content }];
}

function cleanupCode(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return s;
  s = s.replace(/^```(?:html|tsx|jsx|vue|css|js|xml)?\s*\n?/i, "");
  s = s.replace(/```\s*$/i, "");
  return s.trim();
}

async function orFetch(input: GenInput, model: string): Promise<string> {
  const res = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(model),
    body: JSON.stringify({ model, messages: orMessages(input), stream: false }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content: unknown = data.choices?.[0]?.message?.content;
  return cleanupCode(typeof content === "string" ? content : JSON.stringify(content));
}

async function orStreamFetch(
  input: GenInput,
  model: string,
  onToken: (t: string) => void
): Promise<string> {
  const res = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(model),
    body: JSON.stringify({ model, messages: orMessages(input), stream: true }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("OpenRouter: respuesta sin cuerpo");
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let json: any;
      try { json = JSON.parse(data); } catch { continue; }
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) { full += delta; onToken(delta); }
    }
  }
  return cleanupCode(full);
}

export async function openRouterOnce(input: GenInput): Promise<string> {
  let lastErr = "";
  for (const model of OR_MODELS) {
    try {
      return await orFetch(input, model);
    } catch (e: any) {
      lastErr = e.message;
      console.error(`OpenRouter modelo ${model} falló:`, lastErr);
    }
  }
  throw new Error(`Todos los modelos OpenRouter fallaron: ${lastErr}`);
}

export async function geminiOnce(input: GenInput): Promise<string> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("Falta GOOGLE_GENERATIVE_AI_API_KEY");
  const { text } = await generateText({
    model: google("gemini-1.5-flash"),
    messages: geminiMessages(input) as any,
  });
  return cleanupCode(text);
}

export async function resolveOnce(input: GenInput): Promise<{ code: string; provider: string }> {
  try {
    return { code: await openRouterOnce(input), provider: "openrouter" };
  } catch (e: any) {
    console.error("OpenRouter falló, usando Gemini directo:", e.message);
    try {
      return { code: await geminiOnce(input), provider: "gemini" };
    } catch (e2: any) {
      throw new Error(`OpenRouter y Gemini fallaron: ${e.message} | ${e2.message}`);
    }
  }
}

export async function openRouterStream(
  input: GenInput,
  onToken: (t: string) => void
): Promise<string> {
  let lastErr = "";
  for (const model of OR_MODELS) {
    try {
      return await orStreamFetch(input, model, onToken);
    } catch (e: any) {
      lastErr = e.message;
      console.error(`OpenRouter stream modelo ${model} falló:`, lastErr);
    }
  }
  throw new Error(`Todos los modelos OpenRouter fallaron: ${lastErr}`);
}

export async function streamOnce(
  input: GenInput,
  onToken: (t: string) => void
): Promise<{ code: string; provider: string }> {
  let streamedAny = false;
  try {
    const code = await openRouterStream(input, (t) => { streamedAny = true; onToken(t); });
    return { code, provider: "openrouter" };
  } catch (e: any) {
    console.error("OpenRouter stream falló:", e.message);
    if (streamedAny) throw new Error(`OpenRouter se interrumpió: ${e.message}`);
    try {
      const code = await geminiOnce(input);
      onToken(code);
      return { code, provider: "gemini" };
    } catch (e2: any) {
      throw new Error(`OpenRouter y Gemini fallaron: ${e.message} | ${e2.message}`);
    }
  }
}
