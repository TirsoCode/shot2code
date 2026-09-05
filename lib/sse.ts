const encoder = new TextEncoder();

export function sseResponse(
  run: (send: (o: unknown) => void) => void | Promise<void>
): Response {
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(o)}\n\n`));
        } catch {
          /* cliente cerrado */
        }
      };
      try {
        await run(send);
        send({ type: "done" });
      } catch (e: any) {
        send({ type: "error", message: e?.message || "Error interno" });
        send({ type: "done" });
      } finally {
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}