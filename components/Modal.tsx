'use client';

export default function Modal({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; }) {
  if (!open) return null;
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title ?? 'Результаты'}</h3>
          <button className="btn ghost" onClick={onClose}>Закрыть</button>
        </div>
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 1000
};
const sheet: React.CSSProperties = {
  width: 'min(860px, 92vw)', background: '#131721', border: '1px solid #1a1f2b',
  borderRadius: 16, padding: 14, boxShadow: '0 10px 28px rgba(0,0,0,.45)'
};
