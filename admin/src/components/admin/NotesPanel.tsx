import { useEffect, useState, type FormEvent } from "react";

import Button from "../ui/button/Button";
import TextArea from "../form/input/TextArea";
import { api, type AdminNote, type NoteTargetType } from "../../lib/api";

/** Internal-only notes attached to a user, crew, or support ticket — never visible to the end
 * user, regardless of which of those three it's attached to. Reused across UserDetail, CrewDetail,
 * and the Support ticket view. */
export function NotesPanel({ targetType, targetId }: { targetType: NoteTargetType; targetId: string }) {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api.getNotes(targetType, targetId).then(setNotes).catch(() => {});
  }

  useEffect(load, [targetType, targetId]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await api.createNote(targetType, targetId, draft.trim());
      setDraft("");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Internal Notes</h3>

      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        <TextArea rows={2} value={draft} onChange={setDraft} placeholder="Add a note only admins can see…" />
        <Button size="sm" variant="outline" disabled={saving || !draft.trim()}>
          {saving ? "Saving…" : "Add Note"}
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-gray-100 p-3 dark:border-white/[0.05]">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{note.note}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {note.createdByEmail} · {new Date(note.createdAt).toLocaleString()}
                </span>
                <button onClick={() => handleDelete(note.id)} className="text-xs text-error-500 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
