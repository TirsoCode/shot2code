import { createInput } from "@/lib/prompts";
import { resolveOnce, streamOnce } from "@/lib/providers";
import { sseResponse } from "@/lib/sse";
import { DEFAULT_STACK, type StackId } from "@/lib/stacks";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const { image, text, stack, textPrompt, variants = 1, stream = false } = body;

  if (!image && !text?.trim()) {
    return Response.json({ error: "Falta imagen o descripción" }, { status: 400 });
  }

  const s = (stack || DEFAULT_STACK) as StackId;
  const count = Math.min(Math.max(Number(variants) || 1, 1), 2);
  const input = createInput({
    stack: s,
    mode: image ? "image" : "text",
    image,
    description: text,
    instructions: textPrompt,
  });

  if (!stream) {
    try {
      const results = await Promise.all(
        Array.from({ length: count }, () => resolveOnce(input))
      );
      return Response.json({
        codes: results.map((r) => r.code),
        provider: results[0]?.provider,
      });
    } catch (e: any) {
      return Response.json({ error: e.message || "Error generando código" }, { status: 500 });
    }
  }

  return sseResponse(async (send) => {
    for (let v = 0; v < count; v++) {
      send({
        type: "status",
        variant: v,
        text: count > 1 ? `Generando opción ${v + 1} de ${count}…` : "Generando código…",
      });
      try {
        const { code, provider } = await streamOnce(input, (t) =>
          send({ type: "token", variant: v, text: t })
        );
        send({ type: "variant_done", variant: v, provider, code });
      } catch (err: any) {
        console.error(`Variante ${v}:`, err.message);
        send({ type: "variant_error", variant: v, message: err.message || "Error generando variante" });
      }
    }
  });
}