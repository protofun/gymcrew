import { useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";

import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { api, ApiError } from "../../lib/api";

/** TOTP setup for the currently-logged-in admin's own account — see backend/routes/admin-ops.php's
 * enrollTotp/confirmTotp. QR is rendered fully client-side (via the `qrcode` package) from the
 * secret the server just generated — the secret only ever leaves the server once, over the same
 * authenticated HTTPS connection as everything else here. */
export function TwoFactorSetup({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  const [enrolling, setEnrolling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.enrollTotp();
      setSecret(res.secret);
      setQrDataUrl(await QRCode.toDataURL(res.otpauthUrl));
      setEnrolling(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!secret || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.confirmTotp(secret, code.trim());
      toast.success("Two-factor authentication enabled");
      setEnrolling(false);
      setCode("");
      onChange(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to confirm");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!window.confirm("Disable two-factor authentication for your account?")) return;
    setBusy(true);
    try {
      await api.disableTotp();
      toast.success("Two-factor authentication disabled");
      onChange(false);
    } catch {
      toast.error("Failed to disable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-2 text-base font-medium text-gray-800 dark:text-white/90">Two-Factor Authentication</h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Adds an authenticator-app code to your own login — recommended, since this panel has access to every user&apos;s data.
      </p>

      {enabled ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-success-500">Enabled</span>
          <Button size="sm" variant="outline" className="!text-error-500" onClick={disable} disabled={busy}>
            Disable
          </Button>
        </div>
      ) : !enrolling ? (
        <Button size="sm" variant="outline" onClick={startEnroll} disabled={busy}>
          {busy ? "Starting…" : "Enable 2FA"}
        </Button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">Scan this with Google Authenticator, Authy, or similar, then enter the code it shows.</p>
          {qrDataUrl && <img src={qrDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-lg border border-gray-200 dark:border-gray-700" />}
          <div>
            <Label>6-digit code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </div>
          {error && <p className="text-sm text-error-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={confirm} disabled={busy || !code.trim()}>
              {busy ? "Confirming…" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEnrolling(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
