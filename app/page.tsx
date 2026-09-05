"use client";
import { useState, useRef } from "react";

type Format = "html" | "html-tailwind" | "react" | "vue";

export default function Home() {
  const [img, setImg] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("html-tailwind");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImg(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) toBase64(f);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (item) {
      const f = item.getAsFile();
      if (f) toBase64(f);
    }
  };

  const generate = async () => {
    if (!img) { setError("Sube una imagen primero"); return; }
    setLoading(true); setError(""); setCode("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setCode(data.code);
    } catch (e:any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <main onPaste={onPaste} className="min-h-screen">
      {/* Adsterra Banner Top */}
      <div className="w-full flex justify-center py-2 bg-[#111] border-b border-neutral-800">
        <div className="w-[728px] h-[90px] bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">
          Espacio Adsterra 728x90 — pega tu código en layout.tsx
        </div>
      </div>

      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-mono font-bold text-lg">
          Shot2Code
        </div>
        <nav className="hidden md:flex gap-6 text-sm text-neutral-400">
          <a href="#" className="hover:text-white">Ejemplos</a>
          <a href="#" className="hover:text-white">GitHub</a>
        </nav>
        <a href="#generar" className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium">Generar</a>
      </header>

      <section className="max-w-6xl mx-auto px-6 text-center mt-8">
        <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 text-xs text-neutral-400">
          Gratis y open-source
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mt-4">
          Pega tu captura.<br /> <span className="text-neutral-500">Obtén el código.</span>
        </h1>
        <p className="text-neutral-400 mt-4 max-w-2xl mx-auto">
          Arrastra cualquier screenshot y elige el formato: HTML, React + Tailwind, Vue. Preview instantánea lista para Vercel.
        </p>
      </section>

      <section id="generar" className="max-w-6xl mx-auto px-6 mt-10 grid lg:grid-cols-2 gap-6">
        {/* LEFT: Upload */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6"
        >
          <div className="border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center bg-[#0a0a0a] min-h-[280px] flex flex-col items-center justify-center">
            {img ? (
              <img src={img} alt="preview" className="max-h-64 rounded-lg shadow" />
            ) : (
              <>
                <p className="font-medium">Arrastra y suelta tu captura aquí</p>
                <p className="text-xs text-neutral-500 mt-1">PNG, JPG, WebP — o pega con Ctrl+V</p>
              </>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => fileRef.current?.click()} className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium">
                Subir imagen
              </button>
              <span className="text-xs text-neutral-500 self-center">o Ctrl+V</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && toBase64(e.target.files[0])} />
            {img && <button onClick={() => setImg(null)} className="text-xs text-neutral-500 mt-3 hover:text-white">Quitar imagen</button>}
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium mb-3">¿En qué formato quieres el código?</p>
            <div className="grid grid-cols-2 gap-2">
              {(["html", "html-tailwind", "react", "vue"] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2.5 rounded-xl text-sm border text-left ${format === f ? "bg-white text-black border-white" : "bg-[#0a0a0a] text-neutral-300 border-neutral-800 hover:border-neutral-600"}`}
                >
                  <span className="font-medium block">{f === "html-tailwind" ? "HTML + Tailwind" : f.toUpperCase()}</span>
                  <span className="text-xs opacity-60">{f === "react" ? "Next.js component" : f === "vue" ? "Vue SFC" : f === "html" ? "HTML/CSS puro" : "Recomendado"}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="mt-6 w-full bg-white text-black py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Generando..." : "Generar código"}
          </button>
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          <p className="text-[11px] text-neutral-500 text-center mt-3">Modelo gratis: Gemini Flash + fallback open-source</p>
        </div>

        {/* RIGHT: Preview + Code */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#0a0a0a]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-mono">preview</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => code && navigator.clipboard.writeText(code)} className="text-xs bg-white text-black px-3 py-1.5 rounded-full font-medium">Copiar</button>
              <a href={code ? `data:text/html;charset=utf-8,${encodeURIComponent(code)}` : "#"} download={`shot2code-${format}.html`} className={`text-xs px-3 py-1.5 rounded-full font-medium ${code ? "bg-neutral-800 text-white" : "bg-neutral-800 text-neutral-500 pointer-events-none"}`}>Descargar</a>
            </div>
          </div>

          {!code ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
              <p className="text-sm">El código aparecerá aquí</p>
              <p className="text-xs mt-1">Split: preview a la izquierda, código a la derecha</p>
            </div>
          ) : (
            <div className="flex-1 grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 min-h-0">
              <div className="bg-white border-r border-neutral-800 overflow-hidden">
                <div className="text-[10px] tracking-widest text-neutral-400 px-3 py-1 bg-neutral-100 border-b">PREVIEW</div>
                <iframe title="preview" srcDoc={code} className="w-full h-[300px] lg:h-[440px] border-0" sandbox="allow-scripts" />
              </div>
              <div className="bg-black flex flex-col min-h-0">
                <div className="text-[10px] tracking-widest text-neutral-500 px-3 py-1 border-b border-neutral-800">CODE — {format}</div>
                <pre className="flex-1 overflow-auto p-3 text-[11px] leading-4 font-mono text-green-300 whitespace-pre-wrap break-words">{code}</pre>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-8 grid md:grid-cols-3 gap-4">
        {[
          { t: "Pixel Perfect", d: "Respeta colores, spacing y tipografía de la captura." },
          { t: "Código limpio", d: "Sin basura, listo para copiar a tu proyecto." },
          { t: "Gratis + Fallback", d: "Gemini gratis y si se agota, open-source (LLaVA)." },
        ].map((f) => (
          <div key={f.t} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <h3 className="font-medium text-sm">{f.t}</h3>
            <p className="text-xs text-neutral-500 mt-1">{f.d}</p>
          </div>
        ))}
      </section>

      <div className="max-w-6xl mx-auto px-6 mt-8 flex justify-center">
        <div className="w-[728px] h-[90px] bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">
          Adsterra Banner 2 — footer
        </div>
      </div>

      <footer className="text-center text-xs text-neutral-600 py-8 mt-4 border-t border-neutral-900">Shot2Code — Desplegado en Vercel • Anónimo • Sin base de datos</footer>
    </main>
  );
}
