import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { Modal } from "../components/ui/modal";
import { api, ApiError, type MarketingIdea, type MarketingIdeaStatus, type MarketingSocial } from "../lib/api";

const STATUS_COLUMNS: { status: MarketingIdeaStatus; label: string; color: "light" | "warning" | "success" }[] = [
  { status: "idea", label: "Idea", color: "light" },
  { status: "planned", label: "Planned", color: "warning" },
  { status: "posted", label: "Posted", color: "success" },
];

const SOCIAL_COLORS = ["#7c3aed", "#db2777", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444"];

type IdeaForm = { title: string; description: string; plannedDate: string };
type PerfForm = { status: MarketingIdeaStatus; views: string; likes: string; comments: string; shares: string; notes: string };

/** Marketing plans per social platform — the admin adds their own socials, tracks post ideas from
 * idea through planned through posted, and logs real performance (views/likes/comments/shares) by
 * hand once a post is live. Nothing here is pulled automatically from any platform's API. */
export default function Marketing() {
  const [socials, setSocials] = useState<MarketingSocial[]>([]);
  const [ideas, setIdeas] = useState<MarketingIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSocialId, setSelectedSocialId] = useState<number | "all">("all");

  const [addSocialOpen, setAddSocialOpen] = useState(false);
  const [socialName, setSocialName] = useState("");
  const [socialHandle, setSocialHandle] = useState("");

  const [addIdeaOpen, setAddIdeaOpen] = useState(false);
  const [ideaForm, setIdeaForm] = useState<IdeaForm>({ title: "", description: "", plannedDate: "" });

  const [editingIdea, setEditingIdea] = useState<MarketingIdea | null>(null);
  const [perfForm, setPerfForm] = useState<PerfForm>({ status: "idea", views: "", likes: "", comments: "", shares: "", notes: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    Promise.all([api.getMarketingSocials(), api.getMarketingIdeas()])
      .then(([s, i]) => {
        setSocials(s.socials);
        setIdeas(i.ideas);
      })
      .catch(() => toast.error("Failed to load marketing plans"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const socialById = useMemo(() => new Map(socials.map((s) => [s.id, s])), [socials]);
  const visibleIdeas = useMemo(
    () => (selectedSocialId === "all" ? ideas : ideas.filter((i) => i.socialId === selectedSocialId)),
    [ideas, selectedSocialId],
  );

  async function handleAddSocial(e: FormEvent) {
    e.preventDefault();
    if (!socialName.trim()) return;
    try {
      const color = SOCIAL_COLORS[socials.length % SOCIAL_COLORS.length];
      await api.createMarketingSocial({ name: socialName.trim(), handle: socialHandle.trim() || undefined, color });
      toast.success("Social added");
      setSocialName("");
      setSocialHandle("");
      setAddSocialOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add social");
    }
  }

  async function handleDeleteSocial(social: MarketingSocial) {
    if (!window.confirm(`Delete ${social.name}? This also deletes all of its post ideas.`)) return;
    await api.deleteMarketingSocial(social.id);
    if (selectedSocialId === social.id) setSelectedSocialId("all");
    load();
  }

  async function handleAddIdea(e: FormEvent) {
    e.preventDefault();
    if (!ideaForm.title.trim() || selectedSocialId === "all") return;
    setSaving(true);
    try {
      await api.createMarketingIdea({
        socialId: selectedSocialId,
        title: ideaForm.title.trim(),
        description: ideaForm.description.trim() || undefined,
        plannedDate: ideaForm.plannedDate || undefined,
      });
      toast.success("Idea added");
      setIdeaForm({ title: "", description: "", plannedDate: "" });
      setAddIdeaOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add idea");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(idea: MarketingIdea, nextStatus: MarketingIdeaStatus) {
    await api.updateMarketingIdea(idea.id, { status: nextStatus });
    load();
  }

  async function handleDeleteIdea(id: number) {
    if (!window.confirm("Delete this post idea?")) return;
    await api.deleteMarketingIdea(id);
    setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  function openEditor(idea: MarketingIdea) {
    setEditingIdea(idea);
    setPerfForm({
      status: idea.status,
      views: idea.views !== null ? String(idea.views) : "",
      likes: idea.likes !== null ? String(idea.likes) : "",
      comments: idea.comments !== null ? String(idea.comments) : "",
      shares: idea.shares !== null ? String(idea.shares) : "",
      notes: idea.notes ?? "",
    });
  }

  async function handleSavePerformance(e: FormEvent) {
    e.preventDefault();
    if (!editingIdea) return;
    setSaving(true);
    try {
      const toNum = (v: string) => (v.trim() === "" ? null : Math.max(0, parseInt(v, 10) || 0));
      await api.updateMarketingIdea(editingIdea.id, {
        status: perfForm.status,
        views: toNum(perfForm.views),
        likes: toNum(perfForm.likes),
        comments: toNum(perfForm.comments),
        shares: toNum(perfForm.shares),
        notes: perfForm.notes.trim(),
      });
      toast.success("Saved");
      setEditingIdea(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <>
      <PageMeta title="Marketing Plans | GymCrew Admin" description="Post ideas and performance per social platform" />
      <PageBreadcrumb pageTitle="Marketing Plans" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Add your own socials, plan post ideas for each one, and log how a video actually did afterwards — views, likes, comments. Nothing here pulls
        automatically from any platform.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedSocialId("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            selectedSocialId === "all" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
          }`}
        >
          All Platforms ({ideas.length})
        </button>
        {socials.map((s) => (
          <div key={s.id} className="group relative">
            <button
              onClick={() => setSelectedSocialId(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedSocialId === s.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
              }`}
              style={selectedSocialId === s.id ? { backgroundColor: s.color ?? undefined } : undefined}
            >
              {s.name}
              {s.handle ? ` · ${s.handle}` : ""} ({ideas.filter((i) => i.socialId === s.id).length})
            </button>
            <button
              onClick={() => handleDeleteSocial(s)}
              title="Delete platform"
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[10px] text-white group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setAddSocialOpen(true)}>
          + Add Platform
        </Button>
      </div>

      {socials.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Add your first social platform to start planning posts.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Button size="sm" disabled={selectedSocialId === "all"} onClick={() => setAddIdeaOpen(true)} title={selectedSocialId === "all" ? "Pick a platform first" : undefined}>
              + New Post Idea
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.status} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</h3>
                  <Badge size="sm" color={col.color}>
                    {visibleIdeas.filter((i) => i.status === col.status).length}
                  </Badge>
                </div>
                <div className="flex flex-col gap-3">
                  {visibleIdeas
                    .filter((i) => i.status === col.status)
                    .map((idea) => {
                      const social = socialById.get(idea.socialId);
                      return (
                        <div key={idea.id} className="cursor-pointer rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-dark" onClick={() => openEditor(idea)}>
                          {selectedSocialId === "all" && social && (
                            <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: social.color ?? "#6b7280" }}>
                              {social.name}
                            </span>
                          )}
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{idea.title}</p>
                          {idea.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{idea.description}</p>}
                          {idea.status === "posted" && (idea.views !== null || idea.likes !== null || idea.comments !== null) && (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {idea.views !== null && `${idea.views.toLocaleString()} views`}
                              {idea.likes !== null && ` · ${idea.likes.toLocaleString()} likes`}
                              {idea.comments !== null && ` · ${idea.comments.toLocaleString()} comments`}
                            </p>
                          )}
                          <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={idea.status}
                              onChange={(e) => handleMove(idea, e.target.value as MarketingIdeaStatus)}
                              className="rounded-lg border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
                            >
                              {STATUS_COLUMNS.map((c) => (
                                <option key={c.status} value={c.status}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => handleDeleteIdea(idea.id)} className="text-xs text-error-500 hover:underline">
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {visibleIdeas.filter((i) => i.status === col.status).length === 0 && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600">Nothing here yet</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={addSocialOpen} onClose={() => setAddSocialOpen(false)} className="max-w-[420px] p-6">
        <form onSubmit={handleAddSocial} className="flex flex-col gap-4">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Platform</h5>
          <div>
            <Label>Name</Label>
            <Input value={socialName} onChange={(e) => setSocialName(e.target.value)} placeholder="e.g. TikTok, Instagram, YouTube" />
          </div>
          <div>
            <Label>Handle (optional)</Label>
            <Input value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} placeholder="@gymcrew" />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setAddSocialOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!socialName.trim()}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={addIdeaOpen} onClose={() => setAddIdeaOpen(false)} className="max-w-[480px] p-6">
        <form onSubmit={handleAddIdea} className="flex flex-col gap-4">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">New Post Idea</h5>
          <div>
            <Label>Title</Label>
            <Input value={ideaForm.title} onChange={(e) => setIdeaForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. 'Rank up' reveal moment" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <TextArea rows={3} value={ideaForm.description} onChange={(v) => setIdeaForm((f) => ({ ...f, description: v }))} />
          </div>
          <div>
            <Label>Planned date (optional)</Label>
            <Input type="date" value={ideaForm.plannedDate} onChange={(e) => setIdeaForm((f) => ({ ...f, plannedDate: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" size="sm" variant="outline" onClick={() => setAddIdeaOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving || !ideaForm.title.trim()}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingIdea} onClose={() => setEditingIdea(null)} className="max-w-[520px] p-6">
        {editingIdea && (
          <form onSubmit={handleSavePerformance} className="flex flex-col gap-4">
            <div>
              <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">{editingIdea.title}</h5>
              {editingIdea.description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{editingIdea.description}</p>}
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={perfForm.status}
                onChange={(e) => setPerfForm((f) => ({ ...f, status: e.target.value as MarketingIdeaStatus }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:text-white/90"
              >
                {STATUS_COLUMNS.map((c) => (
                  <option key={c.status} value={c.status}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Performance (once posted)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label>Views</Label>
                <Input type="number" min="0" value={perfForm.views} onChange={(e) => setPerfForm((f) => ({ ...f, views: e.target.value }))} />
              </div>
              <div>
                <Label>Likes</Label>
                <Input type="number" min="0" value={perfForm.likes} onChange={(e) => setPerfForm((f) => ({ ...f, likes: e.target.value }))} />
              </div>
              <div>
                <Label>Comments</Label>
                <Input type="number" min="0" value={perfForm.comments} onChange={(e) => setPerfForm((f) => ({ ...f, comments: e.target.value }))} />
              </div>
              <div>
                <Label>Shares</Label>
                <Input type="number" min="0" value={perfForm.shares} onChange={(e) => setPerfForm((f) => ({ ...f, shares: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes — how did it actually go?</Label>
              <TextArea rows={3} value={perfForm.notes} onChange={(v) => setPerfForm((f) => ({ ...f, notes: v }))} placeholder="What worked, what didn't, what to try next time…" />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingIdea(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
