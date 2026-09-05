"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STACKS, DEFAULT_STACK, StackId, StackInfo } from "../lib/stacks";

type InputTab = "upload";

export default function Home() {
  const [files, setFiles] = useState<string[]>([]);
  const [stack, setStack] = useState<StackId>(DEFAULT_STACK);
  const [textPrompt, setTextPrompt] = useState("");
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  const activeTab = "upload" as InputTab;
  const hasImage = files.length > 0;

  const addFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setFiles((prev) => [reader.result as string]);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) addFile(f);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) {
      const f = item.getAsFile();
      if (f) addFile(f);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
  };

  const generate = async () => {
    if (!hasImage) { setError("Sube una imagen primero"); return; }
    setLoading(true); setError(""); setCode("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: files[0], stack, textPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setCode(data.code);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // Enter para generar
  useEffect(() => {
    if (!hasImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (document.activeElement === textInputRef.current) return;
        e.preventDefault();
        generate();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage]);

  const selectedStack: StackInfo = STACKS.find((s) => s.id === stack)!;
  const hasInstructions = textPrompt.trim().length > 0;

  return (
    <main onPaste={onPaste} className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Adsterra Banner */}
      <div className="w-full flex justify-center py-2 bg-[#111] border-b border-neutral-800">
        <div className="w-[728px] h-[90px] bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">
          Espacio Adsterra 728x90
        </div>
      </div>

      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="font-mono font-bold text-lg">Shot2Code</div>
        <nav className="hidden md:flex gap-6 text-sm text-neutral-400">
          <a href="#" className="hover:text-white">GitHub</a>
        </nav>
      </header>

      <section className="max-w-xl mx-auto px-6 text-center mt-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Pega tu captura.
          <br /> <span className="text-neutral-500">Obtén el código.</span>
        </h1>
        <p className="text-neutral-400 mt-3 text-sm">
          Arrastra un screenshot y elige tu stack. Preview y código limpio listo para Vercel.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-8">
        <div className="w-full flex flex-col items-center gap-6">
          {/* DROPZONE */}
          {!hasImage ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex w-full min-h-[260px] flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl bg-neutral-900 text-neutral-500 outline-none transition-all cursor-pointer ${
                dragActive ? "border-blue-500 bg-blue-950/30 text-blue-300" : "border-neutral-700"
              }`}
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files && e.target.files[0] && addFile(e.target.files[0])} />
              <p className="text-neutral-200 font-medium">Drop a screenshot aqui</p>
              <p className="text-xs text-neutral-500 mt-2">PNG, JPG, WebP (max 5MB) — o pega con Ctrl+V</p>
              <button className="text-sm text-blue-400 underline underline-offset-4 hover:text-blue-300 mt-3">
                Browse files
              </button>
            </div>
          ) : (
            <div className="w-full">
              <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">
                  <span>Captura</span>
                  <button onClick={() => { setFiles([]); setCode(""); }} className="text-neutral-400 hover:text-white">
                    Clear
                  </button>
                </div>
                <div className="mt-3 rounded-md bg-neutral-950 p-2 overflow-hidden">
                  <img src={files[0]} alt="preview" className="mx-auto max-h-[260px] object-contain rounded" />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Arrastra otra imagen para cambiar</p>
              </div>
            </div>
          )}

          {/* STACK + INSTRUCTIONS + GENERATE CARD */}
          <div className="w-full max-w-2xl">
            <div className="overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900">
              {/* Stack row */}
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-neutral-300 mb-3">Stack</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STACKS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStack(s.id)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors text-left ${
                        stack === s.id
                          ? "border-blue-500 bg-blue-950/40 text-white"
                          : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                      }`}
                    >
                      <span className="flex items-center gap-0.5">
                        {s.badges.map((b) => (
                          <span
                            key={b.name}
                            className="h-4 inline-flex items-center px-1 rounded font-bold text-[9px]"
                            style={{ color: b.color, backgroundColor: b.bg }}
                          >
                            {b.name}
                          </span>
                        ))}
                      </span>
                      <span className="font-medium">{s.label}</span>
                      {s.beta && (
                        <span className="ml-auto text-[9px] uppercase text-amber-400">beta</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions toggle */}
              <div className="border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setInstructionsOpen((v) => !v)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-800/50 transition-colors"
                >
                  <span className="text-sm font-medium text-neutral-300">
                    {hasInstructions ? "Instrucciones adicionales" : "Add instructions"}
                  </span>
                  {!hasInstructions && (
                    <span className="text-[11px] text-neutral-500">Optional</span>
                  )}
                  <span className="ml-auto text-neutral-500 text-xs">
                    {hasInstructions ? "↵" : "+"}
                  </span>
                </button>
                {instructionsOpen && (
                  <div className="px-4 pb-4">
                    <textarea
                      ref={textInputRef}
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      placeholder="Describe algo que quieras cambiar o enfatizar…"
                      className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-neutral-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Generate button */}
              <div className="flex justify-end border-t border-neutral-800 bg-neutral-800/50 px-4 py-3.5">
                <button
                  onClick={generate}
                  disabled={!hasImage || loading}
                  className="w-full sm:w-56 bg-white text-black py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <span className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  )}
                  {loading ? "Generando…" : "Generate Code"}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            <p className="text-[11px] text-neutral-500 text-center mt-3">
              {selectedStack.desc} - OpenRouter primero, fallback Gemini
            </p>
          </div>
        </div>

        {/* PREVIEW + CODE */}
        {code && (
          <div className="mt-6 bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-[#0a0a0a]">
              <span className="text-xs text-neutral-500 font-mono">preview — {selectedStack.label}</span>
              <div className="flex gap-2">
                <button onClick={copyCode} className="text-xs bg-white text-black px-3 py-1 rounded font-medium">Copiar</button>
                <a
                  href={code ? `data:text/html;charset=utf-8,${encodeURIComponent(code)}` : "#"}
                  download={`shot2code.html`}
                  className="text-xs bg-neutral-700 text-white px-3 py-1 rounded font-medium"
                >
                  Descargar
                </a>
              </div>
            </div>
            <div className="grid lg:grid-cols-2 min-h-[380px]">
              <div className="bg-white border-b lg:border-b-0 lg:border-r border-neutral-800">
                <div className="text-[10px] tracking-widest text-neutral-400 px-3 py-1 bg-neutral-100 border-b">PREVIEW</div>
                <iframe title="preview" srcDoc={code} className="w-full h-[340px] lg:h-[420px] border-0" sandbox="allow-scripts" />
              </div>
              <div className="bg-black flex flex-col">
                <div className="text-[10px] tracking-widest text-neutral-500 px-3 py-1 border-b border-neutral-800">CODE — {selectedStack.label}</div>
                <pre ref={codeRef} className="flex-1 overflow-auto p-3 text-[11px] leading-4 font-mono text-green-300 whitespace-pre-wrap break-words">{code}</pre>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="max-w-3xl mx-auto px-6 mb-8 flex justify-center">
        <div className="w-[728px] h-[90px] bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">
          Adsterra Banner 2
        </div>
      </div>

      <footer className="text-center text-xs text-neutral-600 py-8 border-t border-neutral-900">
        Shot2Code — Anónimo • Sin base de datos • Open-source
      </footer>
    </main>
  );
}