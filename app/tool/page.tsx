"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STACKS, DEFAULT_STACK, type StackId, type StackInfo } from "@/lib/stacks";
import Logo from "@/components/Logo";
import CodeEditor from "@/components/CodeEditor";

type Mode = "image" | "text";
type View = "split" | "preview" | "code";

interface Version {
  id: string;
  label: string;
  mode: Mode;
  stack: StackId;
  status: "idle" | "streaming" | "error";
  provider?: string;
  error?: string;
  variants: string[];
  selectedVariant: number;
  createdAt: number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const INJECT_SCRIPT = `<script>
(function(){
  var cur=null;
  function desc(el){
    var t=(el.tagName||'ELEM').toLowerCase();
    if(el.id)t+='#'+el.id;
    var cls=typeof el.className==='string'?el.className.trim().split(/\s+/).slice(0,2):[];
    if(cls.length)t+='.'+cls.join('.');
    return t;
  }
  document.addEventListener('mouseover',function(e){
    var el=e.target;
    if(!el||el===document.body||el===document.documentElement)return;
    if(cur&&cur!==el){cur.style.outline='';cur.style.outlineOffset='';}
    if(cur!==el){cur=el;el.style.outline='2px solid #2563eb';el.style.outlineOffset='2px';}
  },true);
  document.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    var el=e.target;
    if(el)parent.postMessage({src:'shot2code',type:'select',html:el.outerHTML,title:desc(el)},'*');
  },true);
})();
<\/script>`;

function injectScript(html: string): string {
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i === -1 ? html + INJECT_SCRIPT : html.slice(0, i) + INJECT_SCRIPT + html.slice(i);
}

function timeAgo(t: number): string {
  const d = Date.now() - t;
  if (d < 60000) return "ahora";
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(t).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

export default function Tool() {
  const [mode, setMode] = useState<Mode>("image");
  const [file, setFile] = useState("");
  const [description, setDescription] = useState("");
  const [stack, setStack] = useState<StackId>(DEFAULT_STACK);
  const [instructions, setInstructions] = useState("");
  const [instrOpen, setInstrOpen] = useState(false);

  const [code, setCode] = useState("");
  const [srcDoc, setSrcDoc] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("split");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedHtml, setSelectedHtml] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [editText, setEditText] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const active = useMemo(() => versions.find((v) => v.id === activeId) || null, [versions, activeId]);
  const showPreview = view === "split" || view === "preview";
  const showCode = view === "split" || view === "code";
  const selectedStack: StackInfo = STACKS.find((s) => s.id === stack)!;

  const addFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => setFile(r.result as string);
    r.readAsDataURL(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) addFile(f);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    const f = item?.getAsFile();
    if (f) addFile(f);
  };

  useEffect(() => {
    const h = (e: MessageEvent) => {
      const d = e.data as any;
      if (d?.src === "shot2code" && d?.type === "select") {
        setSelectedHtml(d.html || "");
        setSelectedTag(d.title || "");
        setSelectMode(false);
      }
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);

  useEffect(() => () => acRef.current?.abort(), []);

  useEffect(() => {
    const html = selectMode && code ? injectScript(code) : code;
    setSrcDoc(html);
  }, [code, selectMode]);

  const canGenerate = busy
    ? false
    : mode === "image" ? !!file : description.trim().length > 0;

  const cancelStream = () => {
    acRef.current?.abort();
    setBusy(false);
    busyRef.current = false;
    setStatusMsg("");
  };

  const doGenerate = async () => {
    if (busyRef.current) return;
    if (mode === "image" && !file) { setError("Sube una imagen"); return; }
    if (mode === "text" && !description.trim()) { setError("Escribe una descripción"); return; }

    const vid = uid();
    const version: Version = {
      id: vid,
      label: mode === "image" ? "Desde imagen" : description.slice(0, 40),
      mode,
      stack,
      status: "streaming",
      variants: [""],
      selectedVariant: 0,
      createdAt: Date.now(),
    };

    setVersions((p) => [version, ...p]);
    setActiveId(vid);
    setCode("");
    setSrcDoc("");
    setBusy(true);
    busyRef.current = true;
    setError("");
    setStatusMsg("Conectando…");
    if (mode === "image") { setSelectedHtml(""); setSelectedTag(""); setSelectMode(false); }

    const ac = new AbortController();
    acRef.current = ac;

    const parts: Record<number, string> = {};
    let lastProvider = "";

    const flush = () => {
      const c0 = parts[0] || "";
      setCode(c0);
      setVersions((p) => p.map((v) => v.id === vid ? { ...v, variants: [parts[0] || "", parts[1] || ""] } : v));
    };

    let flushTimer = setInterval(flush, 120);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          image: mode === "image" ? file : undefined,
          text: mode === "text" ? description : undefined,
          stack,
          textPrompt: instructions,
          variants: 2,
          stream: true,
        }),
        signal: ac.signal,
      });

      if (!res.body) throw new Error("Sin respuesta");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      for (; ;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          const line = raw.split("\n").find((l) => l.trim().startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          let ev: any;
          try { ev = JSON.parse(data); } catch { continue; }
          if (ev.type === "status") setStatusMsg(ev.text);
          else if (ev.type === "token") {
            parts[ev.variant] = (parts[ev.variant] || "") + ev.text;
          } else if (ev.type === "variant_done") {
            parts[ev.variant] = ev.code;
            lastProvider = ev.provider || lastProvider;
          } else if (ev.type === "variant_error" || ev.type === "error") {
            setError(ev.message || "Error en la generación");
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(busyRef.current ? (e?.message || "Error de red") : "Cancelado");
      }
    } finally {
      clearInterval(flushTimer);
      flush();
      const final = [parts[0] || "", parts[1] || ""];
      setVersions((p) => p.map((v) => v.id === vid
        ? { ...v, status: "idle", variants: final, selectedVariant: 0, provider: lastProvider }
        : v
      ));
      setCode(final[0] || "");
      setBusy(false);
      busyRef.current = false;
      setStatusMsg("");
      acRef.current = null;
    }
  };

  const doEdit = async () => {
    if (busyRef.current || !code) return;
    const instr = editText.trim();
    if (!instr) { setError("Escribe qué quieres cambiar"); return; }

    const vid = uid();
    const version: Version = {
      id: vid,
      label: `Edit: ${instr.slice(0, 35)}${instr.length > 35 ? "…" : ""}`,
      mode,
      stack,
      status: "streaming",
      variants: [""],
      selectedVariant: 0,
      createdAt: Date.now(),
    };

    setVersions((p) => [version, ...p]);
    setActiveId(vid);
    setBusy(true);
    busyRef.current = true;
    setError("");
    setStatusMsg("Editando…");

    const ac = new AbortController();
    acRef.current = ac;
    let part = "";

    const flush = () => {
      setCode(part);
      setVersions((p) => p.map((v) => v.id === vid ? { ...v, variants: [part] } : v));
    };

    let flushTimer = setInterval(flush, 120);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code, stack, instruction: instr,
          selectedHtml: selectedHtml || undefined,
          image: mode === "image" ? file : undefined,
          stream: true,
        }),
        signal: ac.signal,
      });

      if (!res.body) throw new Error("Sin respuesta");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      for (; ;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          const line = raw.split("\n").find((l) => l.trim().startsWith("data:"));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          let ev: any;
          try { ev = JSON.parse(data); } catch { continue; }
          if (ev.type === "status") setStatusMsg(ev.text);
          else if (ev.type === "token") { part += ev.text; }
          else if (ev.type === "variant_done") { part = ev.code; }
          else if (ev.type === "error") { setError(ev.message); }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(busyRef.current ? (e?.message || "Error de red") : "Cancelado");
      }
    } finally {
      clearInterval(flushTimer);
      setCode(part || code);
      setVersions((p) => p.map((v) => v.id === vid ? { ...v, status: "idle", variants: [part || code] } : v));
      setBusy(false);
      busyRef.current = false;
      setStatusMsg("");
      acRef.current = null;
    }
  };

  const selectVariant = (i: number) => {
    const v = active;
    if (!v || busy || !v.variants[i]) return;
    setVersions((p) => p.map((x) => x.id === v.id ? { ...x, selectedVariant: i } : x));
    setCode(v.variants[i] || "");
  };

  const restoreVersion = (id: string) => {
    const v = versions.find((x) => x.id === id);
    if (!v || busy) return;
    setActiveId(id);
    setCode(v.variants[v.selectedVariant] || "");
    setStack(v.stack);
    setHistoryOpen(false);
  };

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
  };

  const openInNewTab = () => {
    if (!code) return;
    const b = new Blob([code], { type: "text/html" });
    const u = URL.createObjectURL(b);
    window.open(u, "_blank");
    setTimeout(() => URL.revokeObjectURL(u), 10000);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey || busy) return;
      const idx = Number(e.code.replace("Digit", "")) - 1;
      if (idx >= 0 && active && idx < active.variants.length && active.variants[idx]) {
        selectVariant(idx);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [active, busy]);

  return (
    <main onPaste={mode === "image" ? onPaste : undefined} className="min-h-screen bg-[#f8f9fa]">

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <a href="/">
              <Logo size={26} />
            </a>
            <span className="text-sm font-medium text-gray-400">/</span>
            <span className="text-sm font-semibold text-gray-900">Herramienta</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => !busy && setHistoryOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
              </svg>
              Historial
              {versions.length > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[9px] font-bold text-white">
                  {versions.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-0 lg:gap-4 px-4 py-5">

        {/* SIDEBAR */}
        <aside className="w-full lg:w-[340px] shrink-0 space-y-3 lg:sticky lg:top-[72px] lg:h-fit">

          {/* Input card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Mode tabs */}
            <div className="grid grid-cols-2 border-b border-gray-100">
              <button
                onClick={() => setMode("image")}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                  mode === "image" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
                Imagen
              </button>
              <button
                onClick={() => setMode("text")}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                  mode === "text" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
                </svg>
                Texto
              </button>
            </div>

            {/* Input */}
            {mode === "image" ? (
              !file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className="m-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center cursor-pointer transition-colors hover:border-gray-300 hover:bg-gray-100"
                >
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])} />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Suelta tu captura aquí</p>
                  <p className="mt-1.5 text-xs text-gray-400">PNG, JPG, WebP · Ctrl+V</p>
                  <p className="mt-2 text-xs text-blue-600 underline">Buscar archivo</p>
                </div>
              ) : (
                <div className="p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Captura</span>
                    <button onClick={() => setFile("")} className="text-xs text-gray-400 hover:text-red-500">Quitar</button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-1">
                    <img src={file} alt="captura" className="mx-auto max-h-40 w-auto object-contain" />
                  </div>
                </div>
              )
            ) : (
              <div className="p-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe lo que quieres: 'Un formulario de login con email y contraseña, fondo azul oscuro, botón blanco.'"
                  className="min-h-[120px] w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {/* Stack */}
            <div className="border-t border-gray-100 px-3 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Stack</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STACKS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStack(s.id)}
                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-left text-[11px] transition-all ${
                      stack === s.id
                        ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s.badges[0] && (
                      <span className="text-[9px] font-bold" style={{ color: s.badges[0].color }}>
                        {s.badges[0].name}
                      </span>
                    )}
                    {s.label}
                    {s.beta && <span className="ml-auto text-[8px] text-amber-500">β</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions toggle */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => setInstrOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {instructions ? "Instrucciones" : "Añadir instrucciones"}
                {!instructions && <span className="text-[10px] text-gray-400">(opcional)</span>}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`ml-auto transition-transform ${instrOpen ? "rotate-180" : ""}`}>
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              {instrOpen && (
                <div className="px-3 pb-3">
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Ej: usa paleta verde, tipografía Inter, botón con icono."
                    className="min-h-[60px] w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
            </div>

            {/* Generate button */}
            <div className="border-t border-gray-100 p-3 bg-gray-50">
              <button
                onClick={doGenerate}
                disabled={!canGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {statusMsg || "Generando…"}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
                    </svg>
                    Generar código
                  </>
                )}
              </button>
              {busy && (
                <button onClick={cancelStream}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-500 hover:bg-gray-50">
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Edit card */}
          <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-opacity ${!code ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
              <p className="text-sm font-semibold text-gray-900">Editar con IA</p>
              <button
                onClick={() => setSelectMode((v) => !v)}
                disabled={!code}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                  selectMode
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {selectMode ? "Click en preview…" : "Seleccionar elemento"}
              </button>
            </div>
            <div className="px-3 py-2.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Elemento:</span>
                {selectedTag ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600">
                    {selectedTag}
                    <button onClick={() => { setSelectedHtml(""); setSelectedTag(""); }}
                      className="text-blue-400 hover:text-blue-600">✕</button>
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400">todo el archivo</span>
                )}
              </div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Ej: cambia el color a verde, añade un footer…"
                className="min-h-[56px] w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="border-t border-gray-100 p-3 bg-gray-50">
              <button
                onClick={doEdit}
                disabled={!code || !editText.trim() || busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
                    Editando…
                  </>
                ) : "Aplicar cambio"}
              </button>
            </div>
          </div>

          {/* Status */}
          {(error || statusMsg || active) && (
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs">
              {error ? (
                <p className="flex items-center gap-1.5 text-red-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {error}
                </p>
              ) : statusMsg ? (
                <p className="flex items-center gap-1.5 text-gray-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  {statusMsg}
                </p>
              ) : active ? (
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="truncate text-gray-600">{active.label}</span>
                  <span className="ml-auto text-gray-400">{timeAgo(active.createdAt)}</span>
                </div>
              ) : null}
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400">
            {selectedStack.desc}
          </p>
        </aside>

        {/* MAIN CONTENT */}
        <section className="min-w-0 flex-1">

          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {([["split", "Dividido"], ["preview", "Preview"], ["code", "Código"]] as [View, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {l}
                </button>
              ))}
            </div>

            {showPreview && (
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {([["desktop", "Escritorio"], ["mobile", "Móvil"]] as const).map(([d, l]) => (
                  <button key={d} onClick={() => setDevice(d)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      device === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => setPreviewKey((k) => k + 1)} title="Recargar"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="23,4 23,10 17,10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button onClick={openInNewTab} disabled={!code} title="Abrir en pestaña"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <button onClick={copyCode} disabled={!code}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copiar
              </button>
              <a href={code ? `data:text/html;charset=utf-8,${encodeURIComponent(code)}` : "#"} download="shot2code.html"
                className={`flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 ${code ? "hover:bg-gray-50" : "pointer-events-none opacity-30"}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar
              </a>
            </div>
          </div>

          {/* Variants */}
          {active && active.variants.filter(Boolean).length > 1 && !busy && (
            <div className="mb-3">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Opciones · Alt+1 / Alt+2
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {active.variants.map((v, i) => v && (
                  <button
                    key={i}
                    onClick={() => selectVariant(i)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                      active.selectedVariant === i
                        ? "border-blue-500 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="h-14 bg-white">
                      <iframe title={`variant-${i}`} srcDoc={v}
                        className="pointer-events-none origin-top-left border-0"
                        style={{ width: 480, height: 100, transform: "scale(0.25)", transformOrigin: "top left" }}
                        sandbox="allow-scripts" />
                    </div>
                    <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-2.5 py-1.5 text-[11px]">
                      <span className={`h-2 w-2 rounded-full ${active.selectedVariant === i ? "bg-blue-500" : "bg-gray-300"}`} />
                      <span className="text-gray-600">Opción {i + 1}</span>
                      <span className="ml-auto font-mono text-[9px] text-gray-400">⌥{i + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Split/Preview/Code panels */}
          <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${
            view === "split" ? "grid grid-cols-2" : ""
          }`}>

            {showPreview && (
              <div className={`flex flex-col items-center py-4 ${view === "split" ? "border-r border-gray-100" : "border-b border-gray-100"}`}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                </div>
                <div className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${
                  device === "mobile" ? "w-[375px]" : "w-full"
                }`}>
                  <iframe
                    key={`${previewKey}-${activeId}-${active?.selectedVariant ?? 0}`}
                    title="preview"
                    srcDoc={srcDoc}
                    className={`block border-0 bg-white ${device === "mobile" ? "h-[540px] w-[375px]" : "h-[480px] w-full"}`}
                    sandbox="allow-scripts"
                  />
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  PREVIEW · {device === "mobile" ? "375px" : "Desktop"}
                </p>
              </div>
            )}

            {showCode && (
              <div className={`flex flex-col ${view === "split" ? "" : ""}`}
                style={view === "split" ? {} : { minHeight: "520px" }}>
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-500">
                      {selectedStack.label}
                    </span>
                    {active?.provider && (
                      <span className="text-[10px] text-gray-400">· {active.provider}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {active?.status === "streaming" && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-500">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                        Generando…
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {code.split("\n").length} líneas
                    </span>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={code}
                    onChange={busy ? undefined : setCode}
                    readOnly={busy}
                    placeholder={busy ? "Generando…" : "El código aparecerá aquí una vez generado…"}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <aside className="relative ml-auto flex h-full w-full max-w-[360px] flex-col bg-white border-l border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Historial</p>
              <button onClick={() => setHistoryOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Aún no hay versiones</p>
                  <p className="mt-1 text-xs text-gray-400">Genera tu primera captura</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {versions.map((v) => (
                    <li key={v.id}>
                      <button
                        onClick={() => restoreVersion(v.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                          v.id === activeId
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            v.status === "streaming" ? "animate-pulse bg-blue-500" :
                            v.status === "error" ? "bg-red-500" : "bg-green-500"
                          }`} />
                          <span className="truncate font-medium text-gray-900">{v.label}</span>
                          {v.status === "streaming" && (
                            <span className="ml-auto h-2 w-2 animate-spin rounded-full border border-blue-500/30 border-t-blue-500" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                          <span>{timeAgo(v.createdAt)}</span>
                          <span>·</span>
                          <span>{v.variants.filter(Boolean).length} opciones</span>
                          <span>·</span>
                          <span>{v.stack}</span>
                          {v.provider && <><span>·</span><span>{v.provider}</span></>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-100 px-4 py-2.5 text-center text-[10px] text-gray-400">
              Historial local · se pierde al recargar
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
