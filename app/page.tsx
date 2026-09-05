"use client";
import { useEffect, useState } from "react";
import Logo from "../components/Logo";
import { STACKS } from "../lib/stacks";

const DEMO_HTML = `<!doctype html>
<html>
<head>
<style>
  body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;display:flex;align-items:center;justify-content:center;height:100vh}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center;box-shadow:0 10px 30px rgba(2,6,23,.08);max-width:280px}
  .logo{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#06b6d4);margin:0 auto 16px}
  h1{font-size:20px;margin:0 0 8px}
  p{font-size:13px;color:#64748b;margin:0}
  .btn{display:inline-block;margin-top:18px;padding:10px 22px;background:#0f172a;color:#fff;border-radius:999px;font-size:13px;font-weight:600}
</style>
</head>
<body>
  <div class="card">
    <div class="logo"></div>
    <h1>Tu producto, en código</h1>
    <p>Generado por Shot2Code a partir de un screenshot.</p>
    <span class="btn">Empezar</span>
  </div>
</body>
</html>`;

const LINES = [
  `<div class="card">`,
  `  {/* Dashboard */}`,
  `  <Header title="Analytics" />`,
  `  <section class="grid">`,
  `      <Stat label="Usuarios" value="12.4k" />`,
  `      <Stat label="Ingresos" value="€8,200" />`,
  `  </section>`,
  `</div>`,
];

function DemoPlayer() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [codeLines, setCodeLines] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setStep((s) => (s + 1) % 4);
      if (step === 2) setCodeLines(0);
    }, step === 2 ? 2600 : 1800);
    return () => clearTimeout(t);
  }, [step, playing]);

  useEffect(() => {
    if (!playing || step !== 2) return;
    const i = setInterval(() => {
      setCodeLines((c) => (c >= LINES.length ? c : c + 1));
    }, 700);
    return () => clearInterval(i);
  }, [step, playing]);

  const renderScreen = () => {
    if (step === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.6">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">Suelta tu captura aquí</p>
          <p className="text-xs text-gray-500">PNG, JPG o WebP — pega con Ctrl+V</p>
        </div>
      );
    }
    if (step === 1) {
      return (
        <div className="h-full overflow-hidden p-4">
          <iframe
            title="demo"
            srcDoc={DEMO_HTML}
            className="pointer-events-none h-[68%] w-full rounded-lg border border-gray-200 bg-white"
          />
          <div className="mt-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-gray-400 font-medium">Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {STACKS.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className={`rounded border px-2 py-1 text-[10px] font-medium ${
                    s.id === "html-tailwind"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="flex h-full flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-medium">
              Stream en curso
            </span>
            <span className="animate-pulse text-[10px] text-gray-900 font-medium">Generando…</span>
          </div>
          <div className="flex-1 overflow-hidden rounded-lg bg-[#0d1117] p-3 font-mono text-[11px] leading-5">
            {LINES.slice(0, codeLines || 1).map((l, i) => (
              <div key={i} className="whitespace-pre text-gray-300">{l}</div>
            ))}
            <span className="inline-block h-3.5 w-2 animate-pulse align-middle rounded bg-gray-400" />
          </div>
        </div>
      );
    }
    return (
      <div className="grid h-full grid-cols-2 gap-2 p-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex h-5 items-center border-b border-gray-100 bg-gray-50 px-2 text-[8px] uppercase tracking-[0.15em] text-gray-400 font-medium">
            PREVIEW
          </div>
          <iframe title="result" srcDoc={DEMO_HTML} className="pointer-events-none h-[calc(100%-20px)] w-full" />
        </div>
        <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-[#fafafa]">
          <div className="flex h-5 items-center border-b border-gray-200 bg-gray-50 px-2 text-[8px] uppercase tracking-[0.15em] text-gray-400 font-medium">
            CÓDIGO
          </div>
          <div className="flex-1 overflow-hidden whitespace-pre p-2 font-mono text-[9px] leading-4 text-gray-700">
            {`<div className="card">\n  <Header title="Analytics" />\n  <Stat value="12.4k" />\n</div>`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <div className="mx-auto w-full max-w-xs truncate rounded-full border border-gray-200 bg-white px-3 py-1 text-center font-mono text-[10px] text-gray-400">
            shot2code.app/tool
          </div>
          {playing ? (
            <button
              onClick={() => setPlaying(false)}
              className="px-2 text-xs text-gray-400 hover:text-gray-600"
              aria-label="Pausar demo"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="px-2 text-xs text-gray-400 hover:text-gray-600"
              aria-label="Reproducir demo"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 3l14 9-14 9V3z" />
              </svg>
            </button>
          )}
        </div>
        <div className="h-[300px] sm:h-[360px]">{renderScreen()}</div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        {["Sube tu captura", "Elige stack", "IA genera", "Preview + código"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-[10px] font-medium ${
                step === i ? "text-gray-900" : "text-gray-400"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                  step === i ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 3 && <span className="h-px w-4 bg-gray-200" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Top ad */}
      <div className="flex w-full justify-center py-3 border-b border-gray-100">
        <div className="ad-placeholder flex h-[90px] w-[728px] max-w-full items-center justify-center text-xs">
          Espacio publicitario 728 × 90
        </div>
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Logo size={24} />
        <a
          href="/tool"
          className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold text-white"
        >
          Empezar
        </a>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Convierte capturas
          <br />
          en código limpio
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-gray-500">
          Sube un screenshot, elige el stack y obtiene HTML, React o Vue listo para usar. Sin registro, sin cuenta.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a
            href="/tool"
            className="btn-primary rounded-lg px-7 py-3 text-sm font-semibold text-white"
          >
            Probar ahora
          </a>
          <a
            href="#demo"
            className="btn-ghost rounded-lg px-5 py-3 text-sm font-medium text-gray-700"
          >
            Ver demo
          </a>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="mx-auto max-w-5xl px-6 pb-24 scroll-mt-10">
        <DemoPlayer />
      </section>

      {/* Stacks */}
      <section id="stacks" className="mx-auto max-w-5xl px-6 pb-24 scroll-mt-10">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Stacks disponibles</h2>
          <p className="mt-2 text-gray-500">Elige el formato que mejor se adapte a tu proyecto.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STACKS.map((s) => (
            <div
              key={s.id}
              className="card rounded-xl p-4"
            >
              <div className="mb-2 flex items-center gap-1.5">
                {s.badges.map((b) => (
                  <span
                    key={b.name}
                    className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold"
                    style={{ color: b.color, backgroundColor: b.bg }}
                  >
                    {b.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                {s.label}
                {s.beta && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-700">
                    beta
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="mx-auto max-w-5xl px-6 pb-24 scroll-mt-10">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Así funciona</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { n: "01", t: "Sube tu captura", d: "Arrastra un screenshot, usa Ctrl+V o sube un archivo. Soporta PNG, JPG y WebP." },
            { n: "02", t: "Elige el stack", d: "Selecciona HTML, React, Vue, Bootstrap o Ionic. Añade instrucciones si quieres." },
            { n: "03", t: "Copia el código", d: "Preview en vivo y código limpio listo para copiar, descargar o abrir en CodePen." },
          ].map((s) => (
            <div key={s.n} className="card rounded-xl p-6">
              <div className="mb-4 text-4xl font-bold text-gray-200">{s.n}</div>
              <h3 className="text-base font-semibold text-gray-900">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="card rounded-2xl p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Listo para empezar</h2>
          <p className="mt-2 text-gray-500">
            Sube tu primera captura y genera código en segundos.
          </p>
          <a
            href="/tool"
            className="btn-primary mt-6 inline-block rounded-lg px-8 py-3 text-sm font-semibold text-white"
          >
            Ir a la herramienta
          </a>
        </div>
      </section>

      {/* Bottom ad */}
      <div className="flex justify-center pb-8">
        <div className="ad-placeholder flex h-[90px] w-[728px] max-w-full items-center justify-center text-xs">
          Espacio publicitario 728 × 90
        </div>
      </div>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Shot2Code
      </footer>
    </main>
  );
}
