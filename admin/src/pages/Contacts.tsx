import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { Modal } from "../components/ui/modal";
import { api, ApiError, type AdminContact } from "../lib/api";

type FormState = { email: string; name: string; category: string; note: string };
const EMPTY_FORM: FormState = { email: "", name: "", category: "", note: "" };

/** A plain saved email/contact list for the admin's own outreach — leads, gyms, influencers, press.
 * Entirely separate from real app users (see Users). */
export default function Contacts() {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminContact | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function load() {
    api
      .getAdminContacts()
      .then((res) => setContacts(res.contacts))
      .catch(() => toast.error("Failed to load contacts"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const categories = useMemo(() => Array.from(new Set(contacts.map((c) => c.category).filter((c): c is string => !!c))), [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => `${c.email} ${c.name ?? ""} ${c.category ?? ""} ${c.note ?? ""}`.toLowerCase().includes(q));
  }, [contacts, search]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!addForm.email.trim()) return;
    setSaving(true);
    try {
      await api.createAdminContact({
        email: addForm.email.trim(),
        name: addForm.name.trim() || undefined,
        category: addForm.category.trim() || undefined,
        note: addForm.note.trim() || undefined,
      });
      toast.success("Contact saved");
      setAddForm(EMPTY_FORM);
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(contact: AdminContact) {
    setEditing(contact);
    setEditForm({ email: contact.email, name: contact.name ?? "", category: contact.category ?? "", note: contact.note ?? "" });
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.updateAdminContact(editing.id, {
        email: editForm.email.trim(),
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        note: editForm.note.trim(),
      });
      toast.success("Contact updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact: AdminContact) {
    if (!window.confirm(`Delete ${contact.email}?`)) return;
    await api.deleteAdminContact(contact.id);
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    toast.success("Contact deleted");
  }

  function exportCsv() {
    const rows = filtered.map((c) => ({ email: c.email, name: c.name ?? "", category: c.category ?? "", note: c.note ?? "" }));
    const csv = ["email,name,category,note", ...rows.map((r) => [r.email, r.name, r.category, r.note].map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gymcrew-contacts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageMeta title="Contacts | GymCrew Admin" description="Saved outreach contacts" />
      <PageBreadcrumb pageTitle="Contacts" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Email addresses you want to keep for your own outreach — leads, gyms, influencers, press. Separate from real GymCrew accounts (see Users).
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input placeholder="Search email, name, category…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            + Add Contact
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSearch(c)}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                {["Email", "Name", "Category", "Note", "Added", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No contacts saved yet.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{c.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{c.name || "—"}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{c.category || "—"}</td>
                    <td className="max-w-[240px] truncate px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.note || "—"}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="!text-error-500" onClick={() => handleDelete(c)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} className="max-w-[480px] p-6">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Contact</h5>
          <div>
            <Label>Email</Label>
            <Input type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@example.com" />
          </div>
          <div>
            <Label>Name (optional)</Label>
            <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Category (optional)</Label>
            <Input value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Gym, Influencer, Press" />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <TextArea rows={3} value={addForm.note} onChange={(v) => setAddForm((f) => ({ ...f, note: v }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving || !addForm.email.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} className="max-w-[480px] p-6">
        <form onSubmit={handleEditSave} className="flex flex-col gap-4">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Contact</h5>
          <div>
            <Label>Email</Label>
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div>
            <Label>Note</Label>
            <TextArea rows={3} value={editForm.note} onChange={(v) => setEditForm((f) => ({ ...f, note: v }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
