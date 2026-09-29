import { useEffect, useState } from "react";
import { toast } from "sonner";

import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { api, ApiError, type AiScanLimits } from "../../lib/api";

type AiScanLimitsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** One id edits a single user (e.g. from their detail page, prefilled via `initial`); several
   * applies the same limits to every one of them at once (e.g. a bulk-selected list, always blank). */
  userIds: string[];
  /** The user's current overrides — only meaningful (and only passed) for a single-user edit. */
  initial?: AiScanLimits;
  onSaved?: (limits: AiScanLimits) => void;
};

function toFieldValue(value: number | null): string {
  return value === null ? "" : String(value);
}

function fromFieldValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Math.max(0, Math.round(Number(trimmed)));
}

/** Sets per-user AI meal-scan credit overrides — day/week/month, any combination — used from both
 * UserDetail's own "AI Scan Limits" card and UsersList's bulk-select action bar. A blank field clears
 * that period's override, falling back to the shared default (App Controls) or the unlimited
 * allowlist for that account. */
export function AiScanLimitsModal({ isOpen, onClose, userIds, initial, onSaved }: AiScanLimitsModalProps) {
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDaily(toFieldValue(initial?.daily ?? null));
    setWeekly(toFieldValue(initial?.weekly ?? null));
    setMonthly(toFieldValue(initial?.monthly ?? null));
  }, [isOpen, initial]);

  const isBulk = userIds.length > 1;

  async function handleSave() {
    const limits: AiScanLimits = {
      daily: fromFieldValue(daily),
      weekly: fromFieldValue(weekly),
      monthly: fromFieldValue(monthly),
    };
    setSaving(true);
    try {
      if (isBulk) {
        const res = await api.bulkSetUserAiScanLimits(userIds, limits);
        toast.success(`Updated AI scan limits for ${res.updated} user${res.updated === 1 ? "" : "s"}`);
      } else {
        await api.setUserAiScanLimits(userIds[0], limits);
        toast.success("AI scan limits updated");
      }
      onSaved?.(limits);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update AI scan limits");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[480px] p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h5 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            AI Scan Limits — {isBulk ? `${userIds.length} Users` : "This User"}
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overrides the shared default for {isBulk ? "these accounts" : "this account"}. Leave a field blank to fall
            back to the global default (App Controls) or stay unlimited if this account is on that list. Set any
            combination of day/week/month — whichever is reached first blocks the next scan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Per day</Label>
            <Input type="number" min="0" value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="Default" />
          </div>
          <div>
            <Label>Per week</Label>
            <Input type="number" min="0" value={weekly} onChange={(e) => setWeekly(e.target.value)} placeholder="No cap" />
          </div>
          <div>
            <Label>Per month</Label>
            <Input type="number" min="0" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="No cap" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
