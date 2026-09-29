import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import TextArea from "../components/form/input/TextArea";
import { Modal } from "../components/ui/modal";
import { api, ApiError, type FinanceEntry, type FinanceRecurring, type FinanceType } from "../lib/api";

const TYPE_OPTIONS = [
  { value: "cost", label: "Cost" },
  { value: "income", label: "Income" },
];
const RECURRING_OPTIONS = [
  { value: "none", label: "One-off" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type FormState = { type: FinanceType; amount: string; category: string; description: string; occurredOn: string; recurring: FinanceRecurring; notes: string };
const emptyForm = (): FormState => ({ type: "cost", amount: "", category: "", description: "", occurredOn: todayIso(), recurring: "none", notes: "" });

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Every cost and every bit of income for the app/business, logged by hand — not connected to any
 * real payment processor (there is no subscription billing built yet). */
export default function Finance() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FinanceType | "all">("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  function load() {
    api
      .getFinanceEntries()
      .then((res) => setEntries(res.entries))
      .catch(() => toast.error("Failed to load finance entries"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const months = useMemo(() => Array.from(new Set(entries.map((e) => e.occurredOn.slice(0, 7)))).sort().reverse(), [entries]);

  const filtered = useMemo(
    () =>
      entries.filter((e) => (typeFilter === "all" || e.type === typeFilter) && (monthFilter === "all" || e.occurredOn.startsWith(monthFilter))),
    [entries, typeFilter, monthFilter],
  );

  const totals = useMemo(() => {
    const income = filtered.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
    const cost = filtered.filter((e) => e.type === "cost").reduce((sum, e) => sum + e.amount, 0);
    return { income, cost, net: income - cost };
  }, [filtered]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(addForm.amount);
    if (isNaN(amount) || amount < 0 || !addForm.occurredOn) {
      toast.error("Enter a valid amount and date");
      return;
    }
    setSaving(true);
    try {
      await api.createFinanceEntry({
        type: addForm.type,
        amount,
        category: addForm.category.trim() || undefined,
        description: addForm.description.trim() || undefined,
        occurredOn: addForm.occurredOn,
        recurring: addForm.recurring,
        notes: addForm.notes.trim() || undefined,
      });
      toast.success("Entry added");
      setAddForm(emptyForm());
      setAddOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add entry");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(entry: FinanceEntry) {
    setEditing(entry);
    setEditForm({
      type: entry.type,
      amount: String(entry.amount),
      category: entry.category ?? "",
      description: entry.description ?? "",
      occurredOn: entry.occurredOn,
      recurring: entry.recurring,
      notes: entry.notes ?? "",
    });
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await api.updateFinanceEntry(editing.id, {
        type: editForm.type,
        amount,
        category: editForm.category.trim(),
        description: editForm.description.trim(),
        occurredOn: editForm.occurredOn,
        recurring: editForm.recurring,
        notes: editForm.notes.trim(),
      });
      toast.success("Entry updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: FinanceEntry) {
    if (!window.confirm(`Delete this ${entry.type} entry (${formatMoney(entry.amount, entry.currency)})?`)) return;
    await api.deleteFinanceEntry(entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    toast.success("Entry deleted");
  }

  return (
    <>
      <PageMeta title="Costs & Income | GymCrew Admin" description="Business costs and income log" />
      <PageBreadcrumb pageTitle="Costs & Income" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        A manual log of every cost and every bit of income for the app/business. Not connected to any payment processor — enter each entry yourself.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Income</p>
          <p className="mt-1 text-2xl font-semibold text-success-500">{formatMoney(totals.income, "EUR")}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Costs</p>
          <p className="mt-1 text-2xl font-semibold text-error-500">{formatMoney(totals.cost, "EUR")}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net</p>
          <p className={`mt-1 text-2xl font-semibold ${totals.net >= 0 ? "text-success-500" : "text-error-500"}`}>{formatMoney(totals.net, "EUR")}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "income", "cost"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === t ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
            >
              {t === "all" ? "All" : t === "income" ? "Income" : "Costs"}
            </button>
          ))}
          {months.length > 0 && (
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
            >
              <option value="all">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add Entry
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 dark:border-white/[0.05]">
              <tr>
                {["Date", "Type", "Category", "Description", "Amount", "Recurring", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No entries yet.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{e.occurredOn}</td>
                    <td className="px-5 py-3">
                      <Badge size="sm" color={e.type === "income" ? "success" : "error"}>
                        {e.type === "income" ? "Income" : "Cost"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{e.category || "—"}</td>
                    <td className="max-w-[220px] truncate px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{e.description || "—"}</td>
                    <td className={`px-5 py-3 text-sm font-medium ${e.type === "income" ? "text-success-500" : "text-error-500"}`}>
                      {e.type === "income" ? "+" : "-"}
                      {formatMoney(e.amount, e.currency)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{e.recurring === "none" ? "—" : e.recurring}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="!text-error-500" onClick={() => handleDelete(e)}>
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
          <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Entry</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select options={TYPE_OPTIONS} defaultValue={addForm.type} onChange={(v) => setAddForm((f) => ({ ...f, type: v as FinanceType }))} />
            </div>
            <div>
              <Label>Amount (EUR)</Label>
              <Input type="number" min="0" step={0.01} value={addForm.amount} onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={addForm.occurredOn} onChange={(e) => setAddForm((f) => ({ ...f, occurredOn: e.target.value }))} />
            </div>
            <div>
              <Label>Recurring</Label>
              <Select options={RECURRING_OPTIONS} defaultValue={addForm.recurring} onChange={(v) => setAddForm((f) => ({ ...f, recurring: v as FinanceRecurring }))} />
            </div>
          </div>
          <div>
            <Label>Category (optional)</Label>
            <Input value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Hosting, Ads, App Store" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <TextArea rows={2} value={addForm.notes} onChange={(v) => setAddForm((f) => ({ ...f, notes: v }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} className="max-w-[480px] p-6">
        <form onSubmit={handleEditSave} className="flex flex-col gap-4">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Edit Entry</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select options={TYPE_OPTIONS} defaultValue={editForm.type} onChange={(v) => setEditForm((f) => ({ ...f, type: v as FinanceType }))} />
            </div>
            <div>
              <Label>Amount (EUR)</Label>
              <Input type="number" min="0" step={0.01} value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={editForm.occurredOn} onChange={(e) => setEditForm((f) => ({ ...f, occurredOn: e.target.value }))} />
            </div>
            <div>
              <Label>Recurring</Label>
              <Select options={RECURRING_OPTIONS} defaultValue={editForm.recurring} onChange={(v) => setEditForm((f) => ({ ...f, recurring: v as FinanceRecurring }))} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <TextArea rows={2} value={editForm.notes} onChange={(v) => setEditForm((f) => ({ ...f, notes: v }))} />
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
