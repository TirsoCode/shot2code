import type { StackId } from "./stacks";
import type { GenInput } from "./providers";

export const STACK_PROMPTS: Record<StackId, string> = {
  html:
    "Eres un experto maquetador HTML/CSS. Convierte la entrada (captura o descripción) en un documento HTML + CSS puro, sin frameworks. Usa flexbox/grid, colores, tipografía y espaciados fieles al diseño. Responsive, moderno y limpio. Devuelve SOLO el código HTML completo, sin explicaciones ni markdown.",
  "html-tailwind":
    "Eres un experto en HTML + Tailwind CSS. Genera un documento HTML completo usando el CDN de Tailwind, fiel a la entrada (captura o descripción). Responsive y pixel-perfect. Añade en el <head> el <link> al CDN de Tailwind. Devuelve SOLO el código HTML completo, sin explicaciones ni markdown.",
  react:
    "Eres un experto en React + Tailwind. Genera un componente React funcional (export default function App) a partir de la entrada, con estilos Tailwind. Devuelve SOLO el código TSX, sin explicaciones ni markdown.",
  vue:
    "Eres un experto en Vue 3 + Tailwind. Genera un Single File Component Vue con <template> y <script setup lang='ts'>, con estilos Tailwind. Devuelve SOLO el código Vue, sin explicaciones ni markdown.",
  bootstrap:
    "Eres un experto en HTML + Bootstrap 5. Genera un documento HTML usando el CDN de Bootstrap 5 (navbar, cards, grid, forms, etc). Devuelve SOLO el código HTML completo, sin explicaciones ni markdown.",
  ionic:
    "Eres un experto en Ionic Framework + Tailwind (con React). Genera componentes Ionic (ion-header, ion-content, ion-card, ion-button...) con estilos Tailwind. Devuelve SOLO el código TSX de React + Ionic, sin explicaciones ni markdown.",
};

export interface CreateInputArgs {
  stack: StackId;
  mode: "image" | "text";
  image?: string;
  description?: string;
  instructions?: string;
}

export function createInput(args: CreateInputArgs): GenInput {
  const parts: string[] = [STACK_PROMPTS[args.stack]];
  if (args.mode === "image" && args.image) {
    parts.push("CAPTURA DE PANTALLA A CONVERTIR EN CÓDIGO (imagen adjunta).");
  } else if (args.mode === "text" && args.description?.trim()) {
    parts.push(`DESCRIPCIÓN DEL DISEÑO A GENERAR:\n${args.description.trim()}`);
  }
  if (args.instructions?.trim()) {
    parts.push(`INSTRUCCIONES ADICIONALES DEL USUARIO:\n${args.instructions.trim()}`);
  }
  return {
    text: parts.join("\n\n"),
    image: args.mode === "image" ? args.image : undefined,
  };
}

export interface EditInputArgs {
  stack: StackId;
  code: string;
  instruction: string;
  selectedHtml?: string;
  selectedTag?: string;
  image?: string;
}

export function editInput(args: EditInputArgs): GenInput {
  const parts: string[] = [
    "Eres un editor de código experto. Aplica el cambio solicitado al código de abajo, respetando el stack y las tecnologías usadas. Cambia SOLO lo necesario y devuelve el archivo completo resultante, sin explicaciones ni markdown.",
  ];
  if (args.selectedHtml && args.selectedTag) {
    parts.push(
      `ELEMENTO QUE EL USUARIO SELECCIONÓ EN EL PREVIEW (${args.selectedTag}) y al que principalmente debe aplicar el cambio (outerHTML):\n${args.selectedHtml}`
    );
  }
  parts.push(`CAMBIO SOLICITADO POR EL USUARIO:\n${args.instruction.trim()}`);
  return {
    text: parts.join("\n\n"),
    editHtml: args.code,
    image: args.image,
  };
}