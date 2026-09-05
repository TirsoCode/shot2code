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
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-6">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p className="text-sm font-medium text-neutral-200">Drop a screenshot aqui</p>
          <p className="text-[11px] text-neutral-500">PNG, JPG, WebP — o pega con Ctrl+V</p>
        </div>
      );
    }
    if (step === 1) {
      return (
        <div className="h-full p-4 overflow-hidden">
          <iframe title="demo" srcDoc={DEMO_HTML} className="w-full h-[70%] rounded-lg border border-neutral-700 bg-white pointer-events-none" />
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {STACKS.slice(0, 5).map((s) => (
                <span key={s.id} className={`text-[10px] px-2 py-1 rounded border ${s.id === "html-tailwind" ? "border-blue-500 bg-blue-950/40 text-white" : "border-neutral-700 text-neutral-400"}`}>
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
        <div className="h-full p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Pasos 1-2-3…</span>
            <span className="text-[10px] text-blue-400 animate-pulse">Generando…</span>
          </div>
          <div className="flex-1 bg-black rounded-lg p-3 overflow-hidden font-mono text-[11px] leading-5">
            {LINES.slice(0, codeLines || 1).map((l, i) => (
              <div key={i} className="text-green-300/90 whitespace-pre">{l}</div>
            ))}
            <div className="inline-block w-2 h-3.5 bg-green-300 animate-pulse align-middle" style={{ background: "#4ade80" }} />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full p-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg overflow-hidden border border-neutral-700 bg-white">
          <div className="h-5 bg-neutral-100 border-b border-neutral-200 px-2 flex items-center text-[8px] tracking-widest text-neutral-400">PREVIEW</div>
          <iframe title="result" srcDoc={DEMO_HTML} className="w-full h-[calc(100%-20px)] pointer-events-none" />
        </div>
        <div className="rounded-lg overflow-hidden border border-neutral-700 bg-black flex flex-col">
          <div className="h-5 bg-neutral-900 border-b border-neutral-800 px-2 flex items-center text-[8px] tracking-widest text-neutral-500">CODE</div>
          <div className="flex-1 p-2 font-mono text-[9px] leading-4 text-green-300/90 whitespace-pre overflow-hidden">
            {`<div className="card">\n  <Header title="Analytics" />\n  <Stat value="12.4k" />\n</div>`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Browser mockup */}
      <div className="rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-800/80 border-b border-neutral-700">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
          <div className="ml-3 flex-1 max-w-xs mx-auto bg-neutral-700/60 rounded-full px-3 py-1 text-[10px] text-neutral-400 font-mono text-center truncate">
            shot2code.app
          </div>
          {playing ? (
            <button onClick={() => setPlaying(false)} className="text-neutral-400 hover:text-white text-xs px-2" aria-label="Pausar demo">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
            </button>
          ) : (
            <button onClick={() => setPlaying(true)} className="text-neutral-400 hover:text-white text-xs px-2" aria-label="Reproducir demo">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3l14 9-14 9V3z"/></svg>
            </button>
          )}
        </div>
        <div className="h-[300px] sm:h-[340px]">
          {renderScreen()}
        </div>
      </div>
      {/* Glow */}
      <div className="absolute -inset-4 -z-10 bg-gradient-to-tr from-blue-600/20 via-cyan-500/10 to-transparent blur-2xl rounded-full" />
      {/* Step indicators */}
      <div className="flex justify-center items-center gap-2 mt-4">
        {["Sube tu captura", "Elige stack", "IA genera", "Preview + código"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-[10px] ${step === i ? "text-blue-400" : "text-neutral-600"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${step === i ? "bg-blue-500 text-white" : "bg-neutral-800 text-neutral-500"}`}>
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 3 && <span className="w-4 h-px bg-neutral-700" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Adsterra top */}
      <div className="w-full flex justify-center py-2 bg-[#111] border-b border-neutral-800">
        <div className="w-[728px] h-[90px] bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">
          Espacio Adsterra 728x90
        </div>
      </div>

      {/* NAV */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Logo size={26} />
        <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
          <a href="#demo" className="hover:text-white transition-colors">Demo</a>
          <a href="#stacks" className="hover:text-white transition-colors">Stacks</a>
          <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
          <a href="https://github.com/TirsoCode/shot2code" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </nav>
        <a href="/tool" className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity">
          Abrir la herramienta
        </a>
      </header>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 text-center pt-14 pb-16 sm:pt-20">
        <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-1.5 text-xs text-neutral-300 font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Anónimo · Gratis · Open-source
        </div>
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]">
          De captura
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300">
            a código
          </span>{" "}
          en segundos
        </h1>
        <p className="text-neutral-400 mt-6 max-w-xl mx-auto text-base sm:text-lg">
          Arrastra un screenshot, elige tu stack y la IA te devuelve el
          HTML/React/Vue listo para copiar. Con preview instantánea.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <a href="/tool" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-3.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 hover:brightness-110 transition-all">
            Probar la herramienta gratis
          </a>
          <a href="#demo" className="border border-neutral-700 text-neutral-300 px-8 py-3.5 rounded-full text-sm font-medium hover:bg-neutral-900 transition-colors">
            ▶ Ver cómo funciona
          </a>
        </div>
        <div className="flex justify-center gap-8 mt-10 text-center text-sm">
          {[
            ["6", "stacks soportados"],
            ["100%", "anónimo, sin cuenta"],
            ["2", "proveedores IA (fallback)"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-bold text-white">{n}</div>
              <div className="text-xs text-neutral-500">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO / VIDEO */}
      <section id="demo" className="max-w-6xl mx-auto px-6 pb-24 scroll-mt-10">
        <DemoPlayer />
      </section>

      {/* STACKS */}
      <section id="stacks" className="max-w-5xl mx-auto px-6 pb-24 scroll-mt-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Todos tus stacks
          </h2>
          <p className="text-neutral-400 mt-3 text-sm">
            Elige el formato que usas en tu equipo y copia el código directo a tu proyecto.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {STACKS.map((s) => (
            <div key={s.id} className="group flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 hover:border-blue-500/50 hover:bg-neutral-900 transition-all">
              <span className="flex items-center gap-1 mt-0.5 shrink-0">
                {s.badges.map((b) => (
                  <span
                    key={b.name}
                    className="h-5 inline-flex items-center px-1.5 rounded font-bold text-[10px]"
                    style={{ color: b.color, backgroundColor: b.bg }}
                  >
                    {b.name}
                  </span>
                ))}
              </span>
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {s.label}
                  {s.beta && (
                    <span className="text-[9px] uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">beta</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-6 pb-24 scroll-mt-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Así de simple</h2>
          <p className="text-neutral-400 mt-3 text-sm">Tres pasos. Sin registro. Sin base de datos.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { n: "01", t: "Sube o pega", d: "Arrastra tu screenshot, sube un archivo o usa Ctrl+V. Acepta PNG, JPG y WebP." },
            { n: "02", t: "Elige tu stack", d: "HTML, CSS, React, Vue, Bootstrap o Ionic. Añade instrucciones opcionales si quieres." },
            { n: "03", t: "Copia el código", d: "Preview en vivo a la izquierda, código limpio a la derecha. Copia o descarga el HTML." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 relative overflow-hidden">
              <span className="absolute -top-3 -right-2 text-7xl font-black text-neutral-800 select-none">{s.n}</span>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 flex items-center justify-center text-white text-sm font-bold">
                {s.n}
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="relative rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-[#0a0a0a] p-10 sm:p-14 text-center overflow-hidden">
          <div className="absolute inset-0 -z-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-cyan-500/10" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight relative">¿Tienes una captura? Conviértela ya.</h2>
          <p className="text-neutral-400 mt-4 text-sm relative">Gratis. Abre la herramienta, suelta tu imagen y en segundos tienes el código.</p>
          <a href="/tool" className="relative mt-8 inline-block bg-white text-black px-9 py-3.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity">
            Abrir la herramienta →
          </a>
        </div>
      </section>

      {/* Adsterra footer */}
      <div className="max-w-6xl mx-auto px-6 pb-10 flex justify-center">
        <div className="w-[728px] h-[90px] bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-xs text-neutral-500">
          Adsterra Banner 2 — footer
        </div>
      </div>

      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size={22} />
        <div className="flex items-center gap-6 text-xs text-neutral-600">
          <span>Anónimo</span>
          <span>·</span>
          <span>Sin base de datos</span>
          <span>·</span>
          <a href="https://github.com/TirsoCode/shot2code" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Open-source</a>
        </div>
      </footer>
    </main>
  );
}