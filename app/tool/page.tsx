"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STACKS, DEFAULT_STACK, type StackId, type StackInfo } from "@/lib/stacks";
import Logo from "@/components/Logo";
import CodeEditor from "@/components/CodeEditor";

type Mode = "image" | "text";
type View = "split" | "preview" | "code";

interface Version {
  id: string;
  parentId: string | null;
  label: string;
  mode: Mode;
  sourceImage?: string;
  description?: string;
  instruction?: string;
  selectedHtml?: string;
  selectedTag?: string;
  stack: StackId;
  status: "idle" | "streaming" | "error";
  provider?: string;
  error?: string;
  variants: string[];
  selectedVariant: number;
  createdAt: number;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const INJECT_OPEN = "<scr" + "ipt>";
const INJECT_CLOSE = "</scr" + "ipt>";
const INJECT_SCRIPT = `${INJECT_OPEN}
(function () {
  var cur = null;
  function desc(el) {
    var t = (el.tagName || "ELEM").toLowerCase();
    if (el.id) t += "#" + el.id;
    var cls = typeof el.className === "string" ? el.className.trim().split(/\\s+/).slice(0, 2) : [];
    if (cls.length) t += "." + cls.join(".");
    return t;
  }
  document.addEventListener("mouseover", function (e) {
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (cur && cur !== el) { cur.style.outline = ""; cur.style.outlineOffset = ""; }
    if (cur !== el) { cur = el; el.style.outline = "2px solid #2563eb"; el.style.outlineOffset = "2px"; }
  }, true);
  document.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (el) parent.postMessage({ src: "shot2code", type: "select", html: el.outerHTML, title: desc(el) }, "*");
  }, true);
})();
${INJECT_CLOSE}`;

function injectSelectScript(html: string): string {
  const lower = html.toLowerCase();
  const idx = lower.lastIndexOf("</body>");
  if (idx === -1) return html + INJECT_SCRIPT;
  return html.slice(0, idx) + INJECT_SCRIPT + html.slice(idx);
}

function timeAgo(t: number): string {
  const diff = Date.now() - t;
  if (diff < 60_000) return "ahora";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return new Date(t).toLocaleDateString("es", { day: "2-digit", month: "2-digit" });
}

function fmtTime(t: number): string {
  return new Date(t).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export default function Tool() {
  const [mode, setMode] = useState<Mode>("image");
  const [file, setFile] = useState<string>("");
  const [description, setDescription] = useState("");
  const [stack, setStack] = useState<StackId>(DEFAULT_STACK);
  const [instructions, setInstructions] = useState("");
  const [instrOpen, setInstrOpen] = useState(false);

  const [code, setCode] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<null | "generate" | "edit">(null);
  const busyRef = useRef<null | "generate" | "edit">(null);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const [view, setView] = useState<View>("split");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedHtml, setSelectedHtml] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [editText, setEditText] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<AbortController | null>(null);

  const active = useMemo(() => versions.find((v) => v.id === activeId) || null, [versions, activeId]);
  const isBusy = busy !== null;
  const showPreview = view === "split" || view === "preview";
  const showCode = view === "split" || view === "code";
  const selectedStack: StackInfo = STACKS.find((s) => s.id === stack)!;
  const hasInstructions = instructions.trim().length > 0;

  const addFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setFile(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
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
      const d: any = e.data;
      if (d && d.src === "shot2code" && d.type === "select") {
        setSelectedHtml(d.html || "");
        setSelectedTag(d.title || "");
        setSelectMode(false);
      }
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);

  useEffect(() => () => acRef.current?.abort(), []);

  const setVarAt = (v: Version, i: number, val: string): string[] => {
    const arr = v.variants.slice();
    while (arr.length <= i) arr.push("");
    arr[i] = val;
    return arr;
  };

  const runStreamed = useCallback(async (opts: {
    kind: "generate" | "edit";
    endpoint: string;
    body: Record<string, unknown>;
    version: Omit<Version, "status" | "variants" | "selectedVariant" | "createdAt">;
    variantCount: number;
  }) => {
    const { kind, endpoint, body, version, variantCount } = opts;
    const vid = version.id;
    setVersions((prev) => [
      { ...version, status: "streaming", variants: [""], selectedVariant: 0, createdAt: Date.now() },
      ...prev,
    ]);
    setActiveId(vid);
    setBusy(kind);
    setError("");
    setStatusMsg(kind === "generate" ? "Generando…" : "Editando…");
    if (kind === "generate") {
      setCode("");
      setSelectedHtml("");
      setSelectedTag("");
      setSelectMode(false);
    }

    const parts: Record<number, string> = {};
    const doneIdx: number[] = [];
    let lastProvider = "";
    const ac = new AbortController();
    acRef.current = ac;

    let flushTimer: ReturnType<typeof setInterval> | null = null;
    const pendingFlush = { code: false, variants: false };

    const flushPending = () => {
      if (pendingFlush.code) {
        const c = parts[0] || "";
        setCode(c);
        pendingFlush.code = false;
      }
      if (pendingFlush.variants) {
        setVersions((prev) =>
          prev.map((x) => {
            if (x.id !== vid) return x;
            const newVars = Array.from({ length: variantCount }, (_, i) => parts[i] || "");
            return { ...x, variants: newVars };
          })
        );
        pendingFlush.variants = false;
      }
    };

    const finalize = () => {
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      flushPending();
      const finalVariants = Array.from({ length: variantCount }, (_, i) => parts[i] || "");
      const okIdx = doneIdx.length ? doneIdx[0] : finalVariants.findIndex((c) => c.trim() !== "");
      const pick = okIdx >= 0 ? okIdx : 0;
      setVersions((prev) =>
        prev.map((x) =>
          x.id === vid
            ? { ...x, status: "idle", variants: finalVariants, selectedVariant: pick, provider: lastProvider }
            : x
        )
      );
      setActiveId(vid);
      setCode(finalVariants[pick] || "");
      setBusy(null);
      setStatusMsg("");
      acRef.current = null;
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        let msg = "Error en la petición";
        try { const j = await res.json(); msg = j.error || msg; } catch { /* ignore */ }
        setError(msg);
        finalize();
        return;
      }

      flushTimer = setInterval(flushPending, 150);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
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
            if (ev.variant === 0) pendingFlush.code = true;
            pendingFlush.variants = true;
          } else if (ev.type === "variant_done") {
            parts[ev.variant] = ev.code;
            if (ev.variant === 0) { setCode(ev.code); }
            lastProvider = ev.provider || lastProvider;
            doneIdx.push(ev.variant);
            setVersions((prev) =>
              prev.map((x) =>
                x.id === vid ? { ...x, variants: setVarAt(x, ev.variant, ev.code) } : x
              )
            );
          } else if (ev.type === "variant_error" || ev.type === "error") {
            setError(ev.message);
          }
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError") setError("Cancelado");
      else setError(e?.message || "Error de red");
    } finally {
      finalize();
    }
  }, []);

  const runGenerate = useCallback(async () => {
    if (busyRef.current) return;
    if (mode === "image" && !file) { setError("Sube una imagen primero"); return; }
    if (mode === "text" && !description.trim()) { setError("Escribe una descripción primero"); return; }
    const vid = uid();
    await runStreamed({
      kind: "generate",
      endpoint: "/api/generate",
      body: {
        mode,
        image: mode === "image" ? file : undefined,
        text: mode === "text" ? description : undefined,
        stack,
        textPrompt: instructions,
        variants: 2,
        stream: true,
      },
      version: {
        id: vid, parentId: activeId,
        label: mode === "image" ? "Generar desde imagen" : "Generar desde texto",
        mode, sourceImage: mode === "image" ? file : undefined,
        description: mode === "text" ? description : undefined,
        stack,
      },
      variantCount: 2,
    });
  }, [mode, file, description, stack, instructions, activeId, runStreamed]);

  const runEdit = useCallback(async () => {
    if (busyRef.current || !code) return;
    const instr = editText.trim();
    if (!instr) { setError("Escribe la instrucción de edición"); return; }
    const vid = uid();
    await runStreamed({
      kind: "edit",
      endpoint: "/api/edit",
      body: {
        code, stack, instruction: instr,
        selectedHtml: selectedHtml || undefined,
        image: mode === "image" ? file : undefined,
        stream: true,
      },
      version: {
        id: vid, parentId: activeId,
        label: `Edición: ${instr.slice(0, 40)}${instr.length > 40 ? "…" : ""}`,
        mode, instruction: instr, selectedHtml, selectedTag, stack,
      },
      variantCount: 1,
    });
  }, [code, editText, stack, selectedHtml, selectedTag, mode, file, activeId, runStreamed]);

  const cancelStream = () => acRef.current?.abort();

  const selectVariant = (i: number) => {
    const v = active;
    if (!v || isBusy) return;
    const cv = v.variants[i];
    if (cv == null) return;
    setVersions((prev) =>
      prev.map((x) => x.id === v.id ? { ...x, selectedVariant: i } : x)
    );
    setCode(cv);
  };

  const restoreVersion = (id: string) => {
    if (isBusy) return;
    const v = versions.find((x) => x.id === id);
    if (!v) return;
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
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const refreshPreview = () => setPreviewKey((k) => k + 1);

  const openInCodePen = () => {
    if (!code) return;
    const data = {
      html: code, editors: "100", layout: "left",
      css_external: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css",
      js_external: "https://cdn.tailwindcss.com",
    };
    const input = document.createElement("input");
    input.type = "hidden"; input.name = "data"; input.value = JSON.stringify(data);
    const form = document.createElement("form");
    form.method = "POST"; form.action = "https://codepen.io/pen/define"; form.target = "_blank";
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isBusy) return;
      if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
      const idx = Number(e.code.replace("Digit", "")) - 1;
      if (idx >= 0 && active && idx < active.variants.length && active.variants[idx]) {
        selectVariant(idx);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [active, isBusy]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      if (isBusy) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (mode === "image" && !file) return;
      if (mode === "text" && !description.trim()) return;
      e.preventDefault();
      runGenerate();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isBusy, mode, file, description, runGenerate]);

  const srcDoc = useMemo(
    () => (selectMode && code ? injectSelectScript(code) : code),
    [code, selectMode]
  );

  const canGenerate = isBusy
    ? false
    : mode === "image" ? !!file : description.trim().length > 0;

  return (
    <main onPaste={mode === "image" ? onPaste : undefined} className="page-mesh min-h-screen text-[var(--text-primary)]">

      {/* Anuncio */}
      <div className="w-full flex justify-center py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-[728px] max-w-full h-[90px] ad-placeholder rounded-lg flex items-center justify-center text-xs">
          Espacio Adsterra 728 × 90
        </div>
      </div>

      {/* Nav flotante */}
      <header className="flex items-center justify-center px-4 pt-4">
        <nav className="pill-nav flex w-fit max-w-full items-center gap-1.5 rounded-full px-2 py-1.5">
          <a href="/" className="rounded-full pl-1.5 pr-3 py-1 hover:bg-black/5">
            <Logo size={24} />
          </a>
          <span className="h-5 w-px bg-black/10" />
          <a href="/" className="rounded-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)]">
            Inicio
          </a>
          <a href="https://github.com/TirsoCode/shot2code" target="_blank" rel="noreferrer"
            className="rounded-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)]">
            GitHub
          </a>
          <button
            onClick={() => !isBusy && setHistoryOpen(true)}
            disabled={isBusy}
            className="rounded-full bg-black/5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-black/10 disabled:opacity-40"
          >
            ◷ Historial{versions.length ? ` (${versions.length})` : ""}
          </button>
        </nav>
      </header>

      <section className="mx-auto max-w-[1400px] px-4 pb-6 pt-6 lg:px-6">
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">

          {/* SIDEBAR */}
          <aside className="space-y-3 lg:sticky lg:top-4">

            {/* Input card */}
            <div className="overflow-hidden rounded-2xl card-surface shadow-sm">
              {/* Mode tabs */}
              <div className="grid grid-cols-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setMode("image")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm transition-colors ${
                    mode === "image"
                      ? "bg-[#2563eb] text-white font-medium"
                      : "text-[var(--text-secondary)] hover:bg-black/5"
                  }`}
                >
                  ▣ Imagen
                </button>
                <button
                  onClick={() => setMode("text")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm transition-colors ${
                    mode === "text"
                      ? "bg-[#2563eb] text-white font-medium"
                      : "text-[var(--text-secondary)] hover:bg-black/5"
                  }`}
                >
                  ✎ Texto
                </button>
              </div>

              {/* Input area */}
              {mode === "image" ? (
                !file ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`flex m-2 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? "border-[#2563eb] bg-blue-50"
                        : "border-[var(--border-strong)] hover:border-[#2563eb]/40 hover:bg-black/[0.02]"
                    }`}
                  >
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])} />
                    <p className="text-sm font-medium text-[var(--text-primary)]">Suelta tu captura aquí</p>
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      PNG, JPG o WebP — o pega con{" "}
                      <kbd className="rounded border border-black/10 bg-black/5 px-1.5 py-0.5 text-[10px]">Ctrl+V</kbd>
                    </p>
                    <span className="mt-3 text-xs text-[#2563eb] underline-offset-4 hover:underline">
                      Buscar archivo
                    </span>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] mb-2">
                      <span>Captura</span>
                      <button onClick={() => setFile("")} className="hover:text-red-500">Quitar</button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black/5 p-1.5">
                      <img src={file} alt="captura" className="mx-auto max-h-44 w-auto object-contain" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                      Arrastra otra imagen para reemplazar.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-3">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el componente o pantalla que quieres generar. Ej: una landing de cafetería con un hero, tres tarjetas de productos y un footer."
                    className="min-h-[130px] w-full resize-y rounded-xl border border-[var(--border)] bg-black/[0.02] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:input-focus"
                    style={{ outline: "none" }}
                  />
                </div>
              )}

              {/* Stack */}
              <div style={{ borderTop: "1px solid var(--border)" }} className="px-3 py-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Stack</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {STACKS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStack(s.id)}
                      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-left text-[11px] transition-all ${
                        stack === s.id
                          ? "border-[#2563eb] bg-[#2563eb]/8 text-[#2563eb] font-medium"
                          : "border-[var(--border)] bg-black/[0.02] text-[var(--text-secondary)] hover:border-black/20"
                      }`}
                    >
                      <span className="flex items-center gap-0.5">
                        {s.badges.map((b) => (
                          <span
                            key={b.name}
                            className="inline-flex h-3.5 items-center rounded px-1 text-[8px] font-bold"
                            style={{ color: b.color, backgroundColor: b.bg }}
                          >
                            {b.name}
                          </span>
                        ))}
                      </span>
                      <span className="leading-tight">{s.label}</span>
                      {s.beta && (
                        <span className="ml-auto text-[8px] uppercase text-amber-500">β</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => setInstrOpen((v) => !v)}
                  className="group flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-black/[0.02]"
                >
                  <span className="text-sm text-[var(--text-secondary)]">
                    {hasInstructions ? "Instrucciones adicionales" : "Añadir instrucciones"}
                  </span>
                  {!hasInstructions && (
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">opcional</span>
                  )}
                  <span className="ml-auto text-xs text-[var(--text-muted)]">{hasInstructions ? "↵" : "+"}</span>
                </button>
                {instrOpen && (
                  <div className="px-3 pb-3">
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Detalles extra: paleta, tipografía, secciones obligatorias…"
                      className="min-h-[64px] w-full resize-y rounded-xl border border-[var(--border)] bg-black/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:input-focus"
                      style={{ outline: "none" }}
                    />
                  </div>
                )}
              </div>

              {/* Generate */}
              <div className="flex gap-2 p-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <button
                  onClick={runGenerate}
                  disabled={!canGenerate}
                  className="btn-primary flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === "generate" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {statusMsg || "Generando…"}
                    </span>
                  ) : "Generar código"}
                </button>
                {busy && (
                  <button onClick={cancelStream}
                    className="rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/[0.03]">
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Edit card */}
            <div
              className={`overflow-hidden rounded-2xl card-surface shadow-sm transition-opacity ${
                !code ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-medium text-[var(--text-primary)]">Editar con IA</p>
                <button
                  onClick={() => setSelectMode((v) => !v)}
                  disabled={!code}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                    selectMode
                      ? "border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb]"
                      : "border-[var(--border-strong)] bg-white text-[var(--text-secondary)] hover:bg-black/[0.03]"
                  }`}
                >
                  {selectMode ? "Click en preview…" : "Seleccionar elemento"}
                </button>
              </div>
              <div className="px-3 py-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Elemento:</span>
                  {selectedTag ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/8 px-2 py-0.5 text-[11px] text-[#2563eb]">
                      {selectedTag}
                      <button onClick={() => { setSelectedHtml(""); setSelectedTag(""); }}
                        className="text-[#2563eb]/60 hover:text-[#2563eb]">✕</button>
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      ninguno (edita todo el archivo)
                    </span>
                  )}
                </div>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Ej: cambia el color primario a esmeralda, usa Inter y añade un hero más alto."
                  className="min-h-[60px] w-full resize-y rounded-xl border border-[var(--border)] bg-black/[0.02] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:input-focus"
                  style={{ outline: "none" }}
                />
              </div>
              <div className="flex gap-2 p-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
                <button
                  onClick={runEdit}
                  disabled={!code || !editText.trim() || isBusy}
                  className="flex-1 rounded-xl border border-[#2563eb] bg-[#2563eb]/8 px-4 py-2 text-sm font-medium text-[#2563eb] transition-colors hover:bg-[#2563eb]/12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === "edit" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2563eb]/30 border-t-[#2563eb]" />
                      {statusMsg || "Editando…"}
                    </span>
                  ) : "Aplicar cambio"}
                </button>
              </div>
            </div>

            {/* Status card */}
            <div className="rounded-2xl card-surface px-3 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="step-dot h-1.5 w-1.5 rounded-full" />
                <span className="truncate">{active?.label || "Sin resultados aún"}</span>
                {active?.provider && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    vía {active.provider}
                  </span>
                )}
              </div>
              {error && (
                <p className="mt-1.5 text-[11px] text-red-500">{error}</p>
              )}
            </div>

            <p className="px-1 text-[11px] text-[var(--text-muted)]">
              {selectedStack.desc} · OpenRouter primero, fallback a Gemini
            </p>
          </aside>

          {/* MAIN */}
          <section className="min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl card-surface p-1.5 shadow-sm">
              <div className="inline-flex items-center rounded-xl bg-black/[0.04] p-0.5">
                {(["split", "preview", "code"] as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      view === v
                        ? "bg-white text-[var(--text-primary)] shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {v === "split" ? "Dividido" : v === "preview" ? "Vista previa" : "Código"}
                  </button>
                ))}
              </div>

              {showPreview && (
                <div className="inline-flex items-center rounded-xl bg-black/[0.04] p-0.5">
                  {(["desktop", "mobile"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        device === d
                          ? "bg-white text-[var(--text-primary)] shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {d === "desktop" ? "Escritorio" : "Móvil"}
                    </button>
                  ))}
                </div>
              )}

              <div className="ml-auto flex items-center gap-1">
                <button onClick={refreshPreview} title="Recargar preview"
                  className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)]">
                  ↻
                </button>
                <button onClick={openInNewTab} title="Abrir en pestaña nueva"
                  className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)]">
                  ⤢
                </button>
                {code.trim().startsWith("<!doctype html") && (
                  <button onClick={openInCodePen}
                    className="rounded-lg bg-[#2563eb] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1d4ed8]">
                    CodePen
                  </button>
                )}
                <button onClick={copyCode} disabled={!code}
                  className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-black/[0.03] disabled:opacity-40">
                  Copiar
                </button>
                <a
                  href={code ? `data:text/html;charset=utf-8,${encodeURIComponent(code)}` : "#"}
                  download="shot2code.html"
                  className={`rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-xs text-[var(--text-secondary)] ${
                    code ? "hover:bg-black/[0.03]" : "pointer-events-none opacity-40"
                  }`}
                >
                  Descargar
                </a>
              </div>
            </div>

            {/* Variants strip */}
            {active && active.variants.length > 1 && !isBusy && (
              <div className="mt-3">
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Opciones — Alt + 1 / Alt + 2
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {active.variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => selectVariant(i)}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                        active.selectedVariant === i
                          ? "border-[#2563eb] ring-2 ring-[#2563eb]/20"
                          : "border-[var(--border)] hover:border-black/20"
                      }`}
                    >
                      <div className="h-16 bg-white">
                        <iframe
                          title={`opcion-${i + 1}`}
                          srcDoc={v}
                          className="pointer-events-none origin-top-left border-0"
                          style={{ width: 420, height: 110, transform: "scale(0.32)", transformOrigin: "top left" }}
                          sandbox="allow-scripts"
                        />
                      </div>
                      <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px]">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          i === active.selectedVariant ? "bg-[#2563eb]" : "bg-[var(--text-muted)]"
                        }`} />
                        <span className="text-[var(--text-secondary)]">Opción {i + 1}</span>
                        <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">⌥{i + 1}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div
              className={`mt-3 overflow-hidden rounded-2xl card-surface shadow-sm ${
                view === "split" ? "grid grid-cols-1 lg:grid-cols-2" : "block"
              }`}
            >
              {showPreview && (
                <div
                  className={`flex flex-col items-center py-4 ${
                    view === "split" ? "border-b lg:border-b-0 lg:border-r border-[var(--border)]" : "border-b border-[var(--border)]"
                  }`}
                >
                  <div className="mb-3 w-full max-w-[90%] rounded-full bg-black/[0.03] py-1 text-center text-[10px] tracking-[0.18em] text-[var(--text-muted)]">
                    PREVIEW {device === "mobile" ? "MÓVIL" : "ESCRITORIO"}
                  </div>
                  <div
                    className={`overflow-hidden rounded-xl border border-[var(--border)] bg-white ${
                      device === "mobile" ? "w-[375px] max-w-full" : "w-full"
                    }`}
                  >
                    <iframe
                      key={`${previewKey}-${activeId}-${active?.selectedVariant ?? 0}`}
                      title="preview"
                      srcDoc={srcDoc}
                      className="h-[420px] w-full border-0 lg:h-[540px]"
                      sandbox="allow-scripts"
                    />
                  </div>
                </div>
              )}
              {showCode && (
                <div className="flex min-h-[420px] flex-col bg-[#fafafa] lg:h-[600px]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2 text-[10px] tracking-[0.18em] text-[var(--text-muted)]">
                    <span>CÓDIGO — {selectedStack.label.toUpperCase()}</span>
                    {active?.provider && (
                      <span className="font-mono text-[10px] normal-case text-[var(--text-muted)]">
                        {active.provider}
                      </span>
                    )}
                  </div>
                  <div className="min-h-0 flex-1">
                    <CodeEditor
                      value={code}
                      onChange={isBusy ? undefined : setCode}
                      readOnly={isBusy}
                      placeholder="Genera o selecciona una versión para ver el código…"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      {/* Bottom ad */}
      <div className="mx-auto mb-6 mt-2 flex max-w-[1400px] justify-center px-4 lg:px-6">
        <div className="h-[90px] w-[728px] max-w-full ad-placeholder rounded-lg flex items-center justify-center text-xs">
          Adsterra 728 × 90
        </div>
      </div>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-muted)]">
        Shot2Code
      </footer>

      {/* History drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <aside className="relative ml-auto flex h-full w-full max-w-[380px] flex-col" style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Historial de versiones</p>
              <button onClick={() => setHistoryOpen(false)}
                className="rounded-md px-2 py-1 text-[var(--text-muted)] hover:bg-black/5 hover:text-[var(--text-primary)]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {versions.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs text-[var(--text-muted)]">
                  Aún no has generado nada. Tu primera versión aparecerá aquí.
                </p>
              ) : (
                <ul className="space-y-2">
                  {versions.map((v) => {
                    const isActive = v.id === activeId;
                    return (
                      <li key={v.id}>
                        <button
                          onClick={() => restoreVersion(v.id)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            isActive
                              ? "border-[#2563eb] bg-[#2563eb]/5"
                              : "border-[var(--border)] hover:border-black/20 hover:bg-black/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[12px] text-[var(--text-primary)]">
                            <span className="text-[var(--text-muted)]">{v.mode === "image" ? "▣" : "✎"}</span>
                            <span className="truncate font-medium">{v.label}</span>
                            {v.status === "streaming" && (
                              <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-[#2563eb]" />
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                            {fmtTime(v.createdAt)} · {timeAgo(v.createdAt)} · {v.variants.length} var · {v.stack}
                            {v.provider ? ` · ${v.provider}` : ""}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--text-muted)]">
              Historial local · se pierde al recargar.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}