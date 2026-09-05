# Shot2Code — Captura a Código (Vercel)

Web anónima donde arrastras una captura y eliges formato (HTML / HTML+Tailwind / React / Vue). Genera preview + código listo para copiar.

## Deploy en Vercel (1 click)
1. Crea repo en GitHub y haz push
2. Importa en vercel.com → New Project
3. Añade env var `GOOGLE_GENERATIVE_AI_API_KEY` (gratis en aistudio.google.com)
4. Deploy → ya está

## Gratis + fallback
- Primario: `gemini-2.0-flash` (cuota gratis generosa)
- Fallback: HuggingFace `llava-1.5` / `llama-3.2-vision` con `HF_TOKEN` (open-source)

## Adsterra
Pega tu script en `app/layout.tsx` dentro de `<head>` y reemplaza los placeholders 728x90.

## Uso local
```bash
npm install
npm run dev
```
