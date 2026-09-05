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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Suelta tu captura aquí</p>
          <p className="text-[11px] text-[var(--text-muted)]">
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
            className="pointer-events-none h-[68%] w-full rounded-lg border border-black/10 bg-white"
          />
          <div className="mt-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Stack
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STACKS.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className={`rounded border px-2 py-1 text-[10px] ${
                    s.id === "html-tailwind"
                      ? "border-[#2563eb] bg-[#2563eb]/8 text-[#2563eb]"
                      : "border-black/10 text-[var(--text-secondary)]"
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
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Stream en curso
            </span>
            <span className="animate-pulse text-[10px] text-[#2563eb]">Generando…</span>
          </div>
          <div className="flex-1 overflow-hidden rounded-lg bg-[#0d1117] p-3 font-mono text-[11px] leading-5">
            {LINES.slice(0, codeLines || 1).map((l, i) => (
              <div key={i} className="whitespace-pre text-sky-300/90">
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
        <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className="flex h-5 items-center border-b border-black/10 bg-gray-50 px-2 text-[8px] tracking-[0.18em] text-gray-400">
            PREVIEW
          </div>
          <iframe title="result" srcDoc={DEMO_HTML} className="pointer-events-none h-[calc(100%-20px)] w-full" />
        </div>
        <div className="flex flex-col overflow-hidden rounded-lg border border-black/10 bg-[#0d1117]">
          <div className="flex h-5 items-center border-b border-white/5 bg-[#161b22] px-2 text-[8px] tracking-[0.18em] text-gray-500">
            CÓDIGO
          </div>
          <div className="flex-1 overflow-hidden whitespace-pre p-2 font-mono text-[9px] leading-4 text-sky-300/90">
            {`<div className="card">\n  <Header title="Analytics" />\n  <Stat value="12.4k" />\n</div>`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative mx-auto max-w-2xl">
      <div
        className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl"
        style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12)" }}
      >
        <div className="flex items-center gap-1.5 border-b border-black/10 bg-gray-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="mx-auto w-full max-w-xs truncate rounded-full border border-black/10 bg-white px-3 py-1 text-center font-mono text-[10px] text-gray-400">
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
              className={`flex items-center gap-1.5 text-[10px] ${
                step === i ? "text-[#2563eb]" : "text-[var(--text-muted)]"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                  step === i ? "bg-[#2563eb] text-white" : "bg-black/5 text-[var(--text-muted)]"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 3 && <span className="h-px w-4 bg-black/10" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="page-mesh min-h-screen overflow-x-hidden text-[var(--text-primary)]">
      <div className="aurora" aria-hidden />
      <div className="aurora-glow" aria-hidden />

      {/* Adsterra top */}
      <div className="relative z-10 flex w-full justify-center py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex h-[90px] w-[728px] max-w-full items-center justify-center rounded-lg border border-dashed border-black/10 bg-white text-xs text-[var(--text-muted)]">
          Espacio Adsterra 728×90
        </div>
      </div>

      {/* NAV */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size={26} />
        <nav className="hidden items-center gap-7 text-sm text-[var(--text-secondary)] md:flex">
          <a href="#demo" className="hover:text-[var(--text-primary)] transition-colors">Demo</a>
          <a href="#stacks" className="hover:text-[var(--text-primary)] transition-colors">Stacks</a>
          <a href="#como-funciona" className="hover:text-[var(--text-primary)] transition-colors">Cómo funciona</a>
          <a href="https://github.com/TirsoCode/shot2code" target="_blank" rel="noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
        </nav>
        <a
          href="/tool"
          className="btn-primary rounded-full px-5 py-2 text-sm font-semibold text-white"
        >
          Abrir la herramienta
        </a>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-14 text-center sm:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-1.5 font-mono text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur">
          <span className="step-dot h-1.5 w-1.5 rounded-full" />
          Anónimo · Gratis · Open-source
        </div>
        <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl" style={{ color: "var(--text-primary)" }}>
          De captura
          <br />
          <span className="bg-gradient-to-r from-[#2563eb] via-[#06b6d4] to-[#2563eb] bg-clip-text text-transparent">
            a código
          </span>{" "}
          en segundos
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-[var(--text-secondary)] sm:text-lg">
          Arrastra un screenshot, elige tu stack y la IA te devuelve el
          HTML/React/Vue listo para copiar. Con preview instantánea.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/tool"
            className="btn-primary rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-md"
          >
            Probar la herramienta gratis →
          </a>
          <a
            href="#demo"
            className="rounded-full border border-black/15 bg-white px-8 py-3.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-black/[0.03]"
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
              <div className="bg-gradient-to-r from-[#2563eb] to-[#06b6d4] bg-clip-text text-2xl font-bold text-transparent">
                {n}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{l}</div>
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
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            Todos tus stacks
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Elige el formato que usas en tu equipo y copia el código directo a tu proyecto.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {STACKS.map((s) => (
            <div
              key={s.id}
              className="card-surface group flex items-start gap-3 rounded-2xl p-5 transition-all hover:border-[#2563eb]/40 hover:shadow-md"
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
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {s.label}
                  {s.beta && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-600">
                      beta
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="relative z-10 mx-auto max-w-5xl scroll-mt-10 px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            Así de simple
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
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
              className="card-surface relative overflow-hidden rounded-2xl p-6"
            >
              <span className="absolute -top-3 -right-2 select-none text-7xl font-black text-black/[0.04]">
                {s.n}
              </span>
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16">
        <div
          className="relative overflow-hidden rounded-3xl p-10 text-center sm:p-14"
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #faf5ff 100%)",
            border: "1px solid rgba(37, 99, 235, 0.12)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse at 30% 50%, rgba(37,99,235,0.15), transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(6,182,212,0.1), transparent 60%)",
            }}
          />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
            ¿Tienes una captura? Conviértela ya.
          </h2>
          <p className="relative mt-4 text-sm text-[var(--text-secondary)]">
            Gratis. Abre la herramienta, suelta tu imagen y en segundos tienes el código.
          </p>
          <a
            href="/tool"
            className="btn-primary relative mt-8 inline-block rounded-full px-9 py-3.5 text-sm font-bold text-white shadow-md"
          >
            Abrir la herramienta →
          </a>
        </div>
      </section>

      {/* Adsterra footer */}
      <div className="relative z-10 mx-auto flex max-w-6xl justify-center px-6 pb-10">
        <div className="flex h-[90px] w-[728px] max-w-full items-center justify-center rounded border border-dashed border-black/10 bg-white text-xs text-[var(--text-muted)]">
          Adsterra 728×90
        </div>
      </div>

      <footer className="footer-sep relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t px-6 py-8 sm:flex-row">
        <Logo size={22} />
        <div className="flex items-center gap-6 text-xs text-[var(--text-muted)]">
          <span>Anónimo</span>
          <span>·</span>
          <span>Sin base de datos</span>
          <span>·</span>
          <a href="https://github.com/TirsoCode/shot2code" target="_blank" rel="noreferrer"
            className="transition-colors hover:text-[var(--text-primary)]">
            Open-source
          </a>
        </div>
      </footer>
    </main>
  );
}