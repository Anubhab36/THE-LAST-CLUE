import { useState } from "react";
import type { Case } from "../../types/case";

type Props = {
  gameCase: Case;
  onSubmit: (killer: string, motive: string, method: string) => void | Promise<void>;
  onCancel: () => void;
  canCancel?: boolean;
  submitting?: boolean;
};

export default function Accusation({
  gameCase,
  onSubmit,
  onCancel,
  canCancel = true,
  submitting = false,
}: Props) {
  const [killer, setKiller] = useState("");
  const [motive, setMotive] = useState("");
  const [method, setMethod] = useState("");

  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && canCancel && !submitting) {
      onCancel();
    }
  };

  return (
    <div className="overlay" onMouseDown={closeOnBackdrop}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accusation-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {canCancel && (
          <button
            className="close"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cancel accusation"
          >
            ×
          </button>
        )}

        <span className="eyebrow">FINAL ACCUSATION</span>
        <h2 id="accusation-title">Who killed {gameCase.victim.name}?</h2>

        <label>
          KILLER
          <select
            value={killer}
            onChange={(event) => setKiller(event.target.value)}
            disabled={submitting}
          >
            <option value="">Select suspect</option>
            {gameCase.suspects.map((suspect) => (
              <option key={suspect.id} value={suspect.id}>
                {suspect.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          MOTIVE
          <input
            value={motive}
            onChange={(event) => setMotive(event.target.value)}
            placeholder="What drove the killer?"
            disabled={submitting}
          />
        </label>

        <label>
          METHOD
          <input
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            placeholder="How was the victim killed?"
            disabled={submitting}
          />
        </label>

        <button
          className="primary"
          disabled={!killer || !motive.trim() || !method.trim() || submitting}
          onClick={() => {
            if (!submitting && killer && motive.trim() && method.trim()) {
              void onSubmit(killer, motive.trim(), method.trim());
            }
          }}
        >
          {submitting ? "CALCULATING SCORE…" : "SUBMIT ACCUSATION"}
        </button>
      </div>
    </div>
  );
}
