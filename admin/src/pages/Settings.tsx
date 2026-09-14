import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { api } from "../lib/api";

const FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  { key: "email_from_name", label: "Email \"From\" Name", placeholder: "GymCrew" },
  { key: "support_signature", label: "Support Reply Signature", placeholder: "— The GymCrew Team" },
  { key: "company_name", label: "Company Name (for legal pages)", placeholder: "Your company's legal name" },
];

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function load() {
    api.getSettings().then(setValues).catch(() => {});
  }
  useEffect(load, []);

  async function handleSave(key: string) {
    setSaving(key);
    try {
      await api.updateSetting(key, values[key] ?? "");
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageMeta title="Settings | GymCrew Admin" description="App-wide settings" />
      <PageBreadcrumb pageTitle="Settings" />

      <p className="mb-6 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        These are stored in the database and editable here directly — no redeploy needed. Server secrets (API URLs, the mail
        "From" address itself, database credentials) still live in <code>backend/.env</code> and aren&apos;t editable from the
        UI, for the same reason they were never put in a database to begin with.
      </p>

      <div className="max-w-xl space-y-4">
        {FIELDS.map((field) => (
          <div key={field.key} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <Label>{field.label}</Label>
            <div className="flex gap-2">
              <Input
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
              <Button size="sm" variant="outline" onClick={() => handleSave(field.key)} disabled={saving === field.key}>
                {saving === field.key ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
