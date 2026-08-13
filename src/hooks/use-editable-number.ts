import { useState } from "react";

type UseEditableNumberOptions = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  decimals?: number;
};

export function useEditableNumber({ value, onChange, min, max, decimals = 0 }: UseEditableNumberOptions) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toFixed(decimals));

  function clamp(next: number) {
    return Math.min(max, Math.max(min, Number(next.toFixed(decimals))));
  }

  function startEditing() {
    setDraft(value.toFixed(decimals));
    setEditing(true);
  }

  function commitEdit() {
    const parsed = parseFloat(draft);
    onChange(clamp(Number.isFinite(parsed) ? parsed : value));
    setEditing(false);
  }

  return { editing, draft, setDraft, startEditing, commitEdit, clamp };
}
