export type StackId =
  | "html"
  | "html-tailwind"
  | "react"
  | "vue"
  | "bootstrap"
  | "ionic";

export interface StackInfo {
  id: StackId;
  label: string;
  badges: { name: string; color: string; bg: string }[];
  desc: string;
  beta?: boolean;
}

export const STACKS: StackInfo[] = [
  {
    id: "html-tailwind",
    label: "HTML + Tailwind",
    badges: [
      { name: "HTML", color: "#e44d26", bg: "#2a120a" },
      { name: "TW", color: "#38bdf8", bg: "#0c222e" },
    ],
    desc: "HTML con Tailwind CDN",
  },
  {
    id: "html",
    label: "HTML + CSS",
    badges: [
      { name: "HTML", color: "#e44d26", bg: "#2a120a" },
      { name: "CSS", color: "#3b82f6", bg: "#0c1a2e" },
    ],
    desc: "HTML y CSS puro",
  },
  {
    id: "react",
    label: "React + Tailwind",
    badges: [{ name: "React", color: "#61dafb", bg: "#0c2730" }],
    desc: "Componente React (TSX)",
  },
  {
    id: "vue",
    label: "Vue + Tailwind",
    badges: [{ name: "Vue", color: "#42b883", bg: "#0c2a1c" }],
    desc: "Single File Component",
    beta: true,
  },
  {
    id: "bootstrap",
    label: "Bootstrap",
    badges: [{ name: "BS", color: "#7952b3", bg: "#1f1330" }],
    desc: "HTML con Bootstrap 5",
  },
  {
    id: "ionic",
    label: "Ionic + Tailwind",
    badges: [{ name: "Ionic", color: "#4a86fc", bg: "#0c1c3a" }],
    desc: "Componentes Ionic",
    beta: true,
  },
];

export const DEFAULT_STACK: StackId = "html-tailwind";
