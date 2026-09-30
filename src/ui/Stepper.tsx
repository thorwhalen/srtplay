/**
 * A − value + control for a bounded setting. Each tap is one committed step (no
 * drag, so no preview/commit split); the readout always shows the value with units.
 * Tapping the readout resets to the default.
 */
interface Props {
  label: string;
  display: string;
  onStep: (n: number) => void;
  onReset?: () => void;
  canDown: boolean;
  canUp: boolean;
  downTitle: string;
  upTitle: string;
}

export function Stepper({ label, display, onStep, onReset, canDown, canUp, downTitle, upTitle }: Props) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onStep(-1)} disabled={!canDown} title={downTitle} aria-label={downTitle}>
        −
      </button>
      <button
        type="button"
        className="readout"
        onClick={onReset}
        title={onReset ? `${label}: ${display} (tap to reset)` : `${label}: ${display}`}
        aria-label={`${label} ${display}${onReset ? ', reset' : ''}`}
      >
        <span className="readout-label">{label}</span>
        <span className="readout-value">{display}</span>
      </button>
      <button type="button" onClick={() => onStep(1)} disabled={!canUp} title={upTitle} aria-label={upTitle}>
        +
      </button>
    </div>
  );
}
