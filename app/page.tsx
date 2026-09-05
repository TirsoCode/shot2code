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
    <p>Generado por Shot2Code con IA a partir de un screenshot.</p>
    <span class="btn">Empezar</span>
  </div>
</body>
</html>`;

const LINES = [
  `<div class="card">
    {/* Dashboard */}
    <Header title="Analytics" />`,
  `  <section class="grid">
      <Stat label="Usuarios" value="12.4k" />
      <Stat label="Ingresos" value="€8,200" />`,
  `  </section>
    <footer>Built with Tailwind</footer>
  </div>`,
];

function DemoPlayer() {
  const [step, setStep] = useState(0); // 0 upload, 1 stack, 2 generate, 3 preview
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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-sky-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-100">Suelta tu captura aquí</p>
          <p className="text-[11px] text-neutral-500">
            PNG, JPG o WebP — pega con Ctrl+V
          </p>
        </div>
      );
    }
    if (step === 1) {
      return (
        <div className="h-full overflow-hidden p-4">
          <iframe
            title="demo"
            srcDoc={DEMO_HTML}
            className="pointer-events-none h-[68%] w-full rounded-lg border border-white/10 bg-white"
          />
          <div className="mt-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Stack
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STACKS.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className={`rounded border px-2 py-1 text-[10px] ${
                    s.id === "html-tailwind"
                      ? "border-sky-300/60 bg-sky-300/10 text-white"
                      : "border-white/10 text-neutral-400"
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
            <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              Stream en curso
            </span>
            <span className="animate-pulse text-[10px] text-sky-300">Generando…</span>
          </div>
          <div className="flex-1 overflow-hidden rounded-lg bg-black/60 p-3 font-mono text-[11px] leading-5">
            {LINES.slice(0, codeLines || 1).map((l, i) => (
              <div key={i} className="whitespace-pre text-sky-200/90">
                {l}
              </div>
            ))}
            <span className="inline-block h-3.5 w-2 animate-pulse align-middle bg-sky-300" />
          </div>
        </div>
      );
    }
    return (
      <div className="grid h-full grid-cols-2 gap-2 p-4">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white">
          <div className="flex h-5 items-center border-b border-neutral-200 bg-neutral-100 px-2 text-[8px] tracking-[0.18em] text-neutral-500">
            PREVIEW
          </div>
          <iframe
            title="result"
            srcDoc={DEMO_HTML}
            className="pointer-events-none h-[calc(100%-20px)] w-full"
          />
        </div>
        <div className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black">
          <div className="flex h-5 items-center border-b border-white/10 bg-white/[0.04] px-2 text-[8px] tracking-[0.18em] text-neutral-500">
            CÓDIGO
          </div>
          <div className="flex-1 overflow-hidden whitespace-pre p-2 font-mono text-[9px] leading-4 text-sky-200/90">
            {`<div className="card">\n  <Header title="Analytics" />\n  <Stat value="12.4k" />\n</div>`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_30px_80px_-30px_rgba(56,189,248,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.02] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="mx-auto w-full max-w-xs truncate rounded-full bg-white/[0.04] px-3 py-1 text-center font-mono text-[10px] text-neutral-400">
            shot2code.app/tool
          </div>
          {playing ? (
            <button
              onClick={() => setPlaying(false)}
              className="px-2 text-xs text-neutral-400 hover:text-white"
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
              className="px-2 text-xs text-neutral-400 hover:text-white"
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
              className={`flex items-center gap-1.5 text-[10px] ${
                step === i ? "text-sky-300" : "text-neutral-500"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                  step === i ? "bg-sky-300 text-black" : "bg-white/5 text-neutral-500"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 3 && <span className="h-px w-4 bg-white/10" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden text-white">
      <div className="aurora" aria-hidden />
      <div className="aurora-glow" aria-hidden />

      {/* Adsterra top */}
      <div className="relative z-10 flex w-full justify-center border-b border-white/5 bg-black/30 py-2 backdrop-blur">
        <div className="flex h-[90px] w-[728px] max-w-full items-center justify-center rounded border border-white/10 bg-white/[0.03] text-xs text-neutral-500">
          Espacio Adsterra 728×90
        </div>
      </div>

      {/* NAV */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size={26} />
        <nav className="hidden items-center gap-7 text-sm text-neutral-400 md:flex">
          <a href="#demo" className="hover:text-white transition-colors">Demo</a>
          <a href="#stacks" className="hover:text-white transition-colors">Stacks</a>
          <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
          <a href="https://github.com/TirsoCode/shot2code" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </nav>
        <a
          href="/tool"
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Abrir la herramienta
        </a>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-14 text-center sm:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 font-mono text-xs text-neutral-300 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" />
          Anónimo · Gratis · Open-source
        </div>
        <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
          De captura
          <br />
          <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
            a código
          </span>{" "}
          en segundos
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-neutral-400 sm:text-lg">
          Arrastra un screenshot, elige tu stack y la IA te devuelve el
          HTML/React/Vue listo para copiar. Con preview instantánea.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/tool"
            className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black shadow-[0_0_30px_-5px_rgba(125,211,252,0.45)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_0_45px_-5px_rgba(125,211,252,0.65)] active:scale-[0.98]"
          >
            Probar la herramienta gratis →
          </a>
          <a
            href="#demo"
            className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-white/5"
          >
            Ver cómo funciona
          </a>
        </div>
        <div className="mt-10 flex justify-center gap-8 text-center text-sm">
          {[
            ["6", "stacks soportados"],
            ["100%", "anónimo, sin cuenta"],
            ["2", "proveedores IA (fallback)"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-2xl font-bold text-transparent">
                {n}
              </div>
              <div className="text-xs text-neutral-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="relative z-10 mx-auto max-w-6xl scroll-mt-10 px-6 pb-24">
        <DemoPlayer />
      </section>

      {/* STACKS */}
      <section id="stacks" className="relative z-10 mx-auto max-w-5xl scroll-mt-10 px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todos tus stacks
          </h2>
          <p className="mt-3 text-sm text-neutral-400">
            Elige el formato que usas en tu equipo y copia el código directo a tu proyecto.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {STACKS.map((s) => (
            <div
              key={s.id}
              className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-sky-300/40 hover:bg-white/[0.06]"
            >
              <span className="mt-0.5 flex shrink-0 items-center gap-1">
                {s.badges.map((b) => (
                  <span
                    key={b.name}
                    className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold"
                    style={{ color: b.color, backgroundColor: b.bg }}
                  >
                    {b.name}
                  </span>
                ))}
              </span>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {s.label}
                  {s.beta && (
                    <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-400">
                      beta
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="relative z-10 mx-auto max-w-5xl scroll-mt-10 px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Así de simple</h2>
          <p className="mt-3 text-sm text-neutral-400">
            Tres pasos. Sin registro. Sin base de datos.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { n: "01", t: "Sube o pega", d: "Arrastra tu screenshot, sube un archivo o usa Ctrl+V. Acepta PNG, JPG y WebP." },
            { n: "02", t: "Elige tu stack", d: "HTML, CSS, React, Vue, Bootstrap o Ionic. Añade instrucciones opcionales si quieres." },
            { n: "03", t: "Edita y guarda", d: "Selecciona elementos del preview, itera con IA y conserva cada versión en el historial." },
          ].map((s) => (
            <div
              key={s.n}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
            >
              <span className="absolute -top-3 -right-2 select-none text-7xl font-black text-white/[0.04]">
                {s.n}
              </span>
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-10 text-center backdrop-blur sm:p-14">
          <div className="absolute inset-0 -z-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-cyan-400/10" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Tienes una captura? Conviértela ya.
          </h2>
          <p className="relative mt-4 text-sm text-neutral-400">
            Gratis. Abre la herramienta, suelta tu imagen y en segundos tienes el código.
          </p>
          <a
            href="/tool"
            className="relative mt-8 inline-block rounded-full bg-white px-9 py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-90"
          >
            Abrir la herramienta →
          </a>
        </div>
      </section>

      {/* Adsterra footer */}
      <div className="relative z-10 mx-auto flex max-w-6xl justify-center px-6 pb-10">
        <div className="flex h-[90px] w-[728px] max-w-full items-center justify-center rounded border border-white/10 bg-white/[0.03] text-xs text-neutral-500">
          Adsterra 728×90
        </div>
      </div>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/5 px-6 py-8 sm:flex-row">
        <Logo size={22} />
        <div className="flex items-center gap-6 text-xs text-neutral-500">
          <span>Anónimo</span>
          <span>·</span>
          <span>Sin base de datos</span>
          <span>·</span>
          <a
            href="https://github.com/TirsoCode/shot2code"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            Open-source
          </a>
        </div>
      </footer>
    </main>
  );
}