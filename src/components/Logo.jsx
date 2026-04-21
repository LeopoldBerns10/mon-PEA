export default function Logo({ iconOnly = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#f0c040' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07071a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      </div>
      {!iconOnly && (
        <div>
          <p className="text-text-primary font-black text-sm leading-none tracking-tight">Mon PEA</p>
          <p className="text-text-muted text-[9px] leading-none mt-0.5 font-mono uppercase tracking-widest">Suivi de portefeuille</p>
        </div>
      )}
    </div>
  )
}
