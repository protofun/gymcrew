import { useState } from "react";
import { toast } from "sonner";

import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { api, ApiError } from "../../lib/api";

const MIN_LENGTH = 8;
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** A random 16-character password (no look-alike characters like 0/O or 1/l), from the browser's
 * cryptographic random source — not Math.random. */
function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

type SetPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userLabel: string;
};

/** Sets a new password for a user. Write-only by design: passwords live in the login provider and can
 * never be read back, so the only thing this can do is replace one. */
export function SetPasswordModal({ isOpen, onClose, userId, userLabel }: SetPasswordModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-6 sm:p-8">
      <SetPasswordForm userId={userId} userLabel={userLabel} onClose={onClose} />
    </Modal>
  );
}

function SetPasswordForm({ userId, userLabel, onClose }: Omit<SetPasswordModalProps, "isOpen">) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signOutEverywhere, setSignOutEverywhere] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!window.confirm(`Set a new password for ${userLabel}? Their current password stops working immediately.`)) return;
    setSaving(true);
    try {
      await api.setUserPassword(userId, password, signOutEverywhere);
      toast.success("Password changed");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to change the password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h5 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Set New Password</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          For {userLabel}. The current password can&apos;t be viewed — it can only be replaced. Make sure to pass the new one on to
          the person, it isn&apos;t shown again after you close this window.
        </p>
      </div>

      <div>
        <Label>New password</Label>
        <Input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_LENGTH} characters`}
        />
        <div className="mt-2 flex gap-4 text-xs">
          <button type="button" className="text-brand-500 hover:underline" onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}>
            Generate a strong one
          </button>
          <button type="button" className="text-gray-500 hover:underline dark:text-gray-400" onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? "Hide" : "Show"}
          </button>
          {showPassword && password && (
            <button
              type="button"
              className="text-gray-500 hover:underline dark:text-gray-400"
              onClick={() => navigator.clipboard.writeText(password).then(() => toast.success("Copied"))}
            >
              Copy
            </button>
          )}
        </div>
      </div>

      <Checkbox label="Sign them out of all their devices" checked={signOutEverywhere} onChange={setSignOutEverywhere} />

      <div className="flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={saving || password.length < MIN_LENGTH} onClick={handleSave}>
          {saving ? "Saving…" : "Change password"}
        </Button>
      </div>
    </div>
  );
}
