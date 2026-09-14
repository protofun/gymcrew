import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { api, type FaqItem } from "../lib/api";

export default function Faq() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.getAdminFaq().then(setItems).catch(() => {});
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      await api.createFaqItem({ question: question.trim(), answer: answer.trim() });
      toast.success("Added to the Knowledge Base");
      setQuestion("");
      setAnswer("");
      setShowForm(false);
      load();
    } catch {
      toast.error("Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this FAQ item?")) return;
    await api.deleteFaqItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  }

  return (
    <>
      <PageMeta title="Knowledge Base | GymCrew Admin" description="Manage the in-app FAQ" />
      <PageBreadcrumb pageTitle="Knowledge Base" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Shown to users under Contact &amp; Support in the app.</p>

      <div className="mb-6 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New FAQ Item"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div>
            <Label>Question</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How do I reset my password?" />
          </div>
          <div>
            <Label>Answer</Label>
            <TextArea rows={4} value={answer} onChange={setAnswer} placeholder="The answer, in plain language…" />
          </div>
          <div>
            <Button size="sm" disabled={saving || !question.trim() || !answer.trim()}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No FAQ items yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.question}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.answer}</p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="shrink-0 text-xs text-error-500 hover:underline">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
