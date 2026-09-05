import { editInput } from "@/lib/prompts";
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
  const { code, stack, instruction, selectedHtml, image, stream = true } = body;

  if (!code?.trim() || !instruction?.trim()) {
    return Response.json({ error: "Faltan el código o la instrucción" }, { status: 400 });
  }

  const s = (stack || DEFAULT_STACK) as StackId;
  const input = editInput({
    stack: s,
    code,
    instruction,
    selectedHtml: selectedHtml || undefined,
    image: image || undefined,
  });

  if (!stream) {
    try {
      const { code: rcode, provider } = await resolveOnce(input);
      return Response.json({ code: rcode, provider });
    } catch (e: any) {
      return Response.json({ error: e.message || "Error editando código" }, { status: 500 });
    }
  }

  return sseResponse(async (send) => {
    send({ type: "status", variant: 0, text: "Editando código…" });
    try {
      const { code: rcode, provider } = await streamOnce(input, (t) =>
        send({ type: "token", variant: 0, text: t })
      );
      send({ type: "variant_done", variant: 0, provider, code: rcode });
    } catch (err: any) {
      console.error("Edición falló:", err.message);
      send({ type: "variant_error", variant: 0, message: err.message || "Error editando código" });
    }
  });
}