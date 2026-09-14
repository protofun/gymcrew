import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { TwoFactorSetup } from "../components/admin/TwoFactorSetup";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

type AdminRow = { id: string; email: string; createdAt: number };

export default function Admins() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(admin?.totpEnabled ?? false);

  function load() {
    api.getAdmins().then(setAdmins).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load admins"));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.createAdmin(email, password);
      toast.success(`${email} can now sign in to the admin panel`);
      setEmail("");
      setPassword("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create admin");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this admin's access?")) return;
    try {
      await api.deleteAdmin(id);
      toast.success("Admin removed");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove admin");
    }
  }

  return (
    <>
      <PageMeta title="Admin Management | GymCrew Admin" description="Manage admin panel accounts" />
      <PageBreadcrumb pageTitle="Admin Management" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Admin Accounts</h3>
          <div className="space-y-2">
            {admins.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-white/[0.05]">
                <div>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {row.email} {row.id === admin?.id && <span className="text-xs text-gray-400">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400">Added {new Date(row.createdAt).toLocaleDateString()}</p>
                </div>
                {row.id !== admin?.id && (
                  <Button size="sm" variant="outline" className="!text-error-500" onClick={() => handleDelete(row.id)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Add Admin</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@gymcrew.com" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            {error && <p className="text-sm text-error-500">{error}</p>}
            <Button className="w-full" size="sm" disabled={creating}>
              {creating ? "Adding…" : "Add Admin"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-3">
          <TwoFactorSetup enabled={totpEnabled} onChange={setTotpEnabled} />
        </div>
      </div>
    </>
  );
}
