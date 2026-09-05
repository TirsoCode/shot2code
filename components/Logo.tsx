export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div
        className="relative flex items-center justify-center rounded-lg"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg,#3b82f6 0%,#06b6d4 100%)",
          boxShadow: "0 0 20px rgba(59,130,246,0.45)",
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </div>
      <span className="font-bold tracking-tight" style={{ fontSize: size * 0.72 }}>
        Shot<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">2Code</span>
      </span>
    </div>
  );
}
