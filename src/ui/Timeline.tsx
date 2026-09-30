/**
 * The seek bar. Dragging previews (the time bubble and the subtitle follow the
 * finger) and seeks once, on release; a ghost thumb marks where you were, so you
 * can see how far you moved and find your way back. Arrow keys on the focused bar
 * are handled by the global shortcuts (each press is its own seek).
 */
import { useRef, useState } from 'react';
import { formatTime } from '../srt/parse';

interface Props {
  position: number;
  duration: number;
  /** Called with the dragged-to position while dragging, null when the drag ends. */
  onPreview: (pos: number | null) => void;
  onSeek: (pos: number) => void;
}

export function Timeline({ position, duration, onPreview, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ origin: number; pos: number } | null>(null);

  const posFromEvent = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  };

  const shown = drag ? drag.pos : position;
  const pct = (ms: number) => (duration > 0 ? (ms / duration) * 100 : 0);

  return (
    <div className="timeline">
      <span className="time">{formatTime(shown)}</span>
      <div
        ref={trackRef}
        className={`track${drag ? ' dragging' : ''}`}
        role="slider"
        tabIndex={-1}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration / 1000)}
        aria-valuenow={Math.round(shown / 1000)}
        aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
        onPointerDown={e => {
          if (!duration) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const pos = posFromEvent(e.clientX);
          setDrag({ origin: position, pos });
          onPreview(pos);
        }}
        onPointerMove={e => {
          if (!drag) return;
          const pos = posFromEvent(e.clientX);
          setDrag({ ...drag, pos });
          onPreview(pos);
        }}
        onPointerUp={() => {
          if (!drag) return;
          onSeek(drag.pos);
          onPreview(null);
          setDrag(null);
        }}
        onPointerCancel={() => {
          onPreview(null);
          setDrag(null);
        }}
      >
        <div className="rail" />
        <div className="fill" style={{ width: `${pct(shown)}%` }} />
        {drag && Math.abs(drag.pos - drag.origin) > duration / 500 && (
          <div className="thumb ghost" style={{ left: `${pct(drag.origin)}%` }} aria-hidden />
        )}
        <div className="thumb" style={{ left: `${pct(shown)}%` }} aria-hidden>
          {drag && <span className="bubble">{formatTime(drag.pos)}</span>}
        </div>
      </div>
      <span className="time">{formatTime(duration)}</span>
    </div>
  );
}
