"use client";
import { memo, useMemo, useRef } from "react";

interface Props {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type TokenType = "comment" | "tag" | "attr" | "string" | "plain";

const COLORS: Record<TokenType, string> = {
  plain: "#94a3b8",
  comment: "#64748b",
  tag: "#38bdf8",
  attr: "#fbbf24",
  string: "#4ade80",
};

const TOKEN_RE = /<!--[\s\S]*?-->|<\/?[A-Za-z][\w-]*|[\w-]+(?==)|"[^"]*"|'[^']*'/g;

function tokenize(src: string): Array<{ type: TokenType; value: string }> {
  const tokens: Array<{ type: TokenType; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src))) {
    if (m.index > last) tokens.push({ type: "plain", value: src.slice(last, m.index) });
    const t = m[0];
    if (t.startsWith("<!--")) tokens.push({ type: "comment", value: t });
    else if (t.startsWith("<")) tokens.push({ type: "tag", value: t });
    else if (t.startsWith('"') || t.startsWith("'")) tokens.push({ type: "string", value: t });
    else tokens.push({ type: "attr", value: t });
    last = m.index + t.length;
  }
  if (last < src.length) tokens.push({ type: "plain", value: src.slice(last) });
  return tokens;
}

function highlight(src: string): string {
  if (!src) return "";
  return tokenize(src)
    .map((t) => {
      if (t.type === "plain") return esc(t.value);
      if (t.type === "comment") {
        return `<span style="color:${COLORS.comment};font-style:italic">${esc(t.value)}</span>`;
      }
      return `<span style="color:${COLORS[t.type]}">${esc(t.value)}</span>`;
    })
    .join("");
}

function CodeEditor({ value, onChange, readOnly, placeholder }: Props) {
  const highlighted = useMemo(() => highlight(value), [value]);
  const gutterRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const lineCount = useMemo(() => (value ? value.split("\n").length : 1), [value]);
  const lines = useMemo(() => Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1), [lineCount]);

  const sync = (el: HTMLTextAreaElement) => {
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
    if (hlRef.current) {
      hlRef.current.scrollTop = el.scrollTop;
      hlRef.current.scrollLeft = el.scrollLeft;
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#1e1e2e] text-[12.5px] leading-[1.6]">
      <div
        ref={gutterRef}
        className="w-11 shrink-0 select-none overflow-hidden border-r border-white/5 bg-[#13131a] px-2 py-3 text-right font-mono text-[#3f3f46]"
      >
        {lines.map((n) => (
          <div key={n}>{n}</div>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <pre
          ref={hlRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 font-mono text-[#cdd6f4]"
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
          dangerouslySetInnerHTML={{ __html: highlighted || "&nbsp;" }}
        />
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={(e) => sync(e.currentTarget)}
          readOnly={readOnly}
          spellCheck={false}
          aria-label="Editor de código"
          placeholder={placeholder}
          className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent px-4 py-3 font-mono text-transparent caret-sky-300 outline-none placeholder:text-[#45475a]"
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
        />
      </div>
    </div>
  );
}

export default memo(CodeEditor);