import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { NotesPanel } from "../../components/admin/NotesPanel";
import { api, ApiError, type AdminCrewDetail } from "../../lib/api";

export default function CrewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [crew, setCrew] = useState<AdminCrewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getCrew(id)
      .then(setCrew)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load crew"));
  }, [id]);

  async function toggleDisabled() {
    if (!crew) return;
    const next = !crew.disabled;
    if (!window.confirm(next ? "Disable this crew?" : "Re-enable this crew?")) return;
    await api.setCrewDisabled(crew.id, next);
    setCrew({ ...crew, disabled: next });
  }

  async function handleDelete() {
    if (!crew) return;
    if (!window.confirm(`Permanently delete "${crew.name}"? This removes it for every member. This cannot be undone.`)) return;
    await api.deleteCrew(crew.id);
    navigate("/crews");
  }

  if (error) return <p className="text-sm text-error-500">{error}</p>;
  if (!crew) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <>
      <PageMeta title={`${crew.name} | GymCrew Admin`} description="Crew detail" />
      <PageBreadcrumb pageTitle={crew.name} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">Members ({crew.members.length}/{crew.maxMembers})</h3>
            <Badge size="sm" color={crew.disabled ? "error" : "success"}>
              {crew.disabled ? "Disabled" : "Active"}
            </Badge>
          </div>
          <div className="space-y-2">
            {crew.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 dark:border-white/[0.05]">
                <Link to={`/users/${member.id}`} className="text-sm text-gray-800 hover:underline dark:text-white/90">
                  {member.fullName || member.username || member.id}
                </Link>
                <Badge size="sm" color="light">
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Crew Info</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Tagline</dt>
                <dd className="text-gray-800 dark:text-white/90">{crew.tagline || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Training Type</dt>
                <dd className="text-gray-800 dark:text-white/90">{crew.trainingType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Privacy</dt>
                <dd className="capitalize text-gray-800 dark:text-white/90">{crew.privacy}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Division / XP</dt>
                <dd className="text-gray-800 dark:text-white/90">{crew.division} · {crew.xp.toLocaleString()} XP</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Invite Code</dt>
                <dd className="font-mono text-gray-800 dark:text-white/90">{crew.inviteCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-800 dark:text-white/90">{new Date(crew.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Actions</h3>
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={toggleDisabled}>
                {crew.disabled ? "Re-enable Crew" : "Disable Crew"}
              </Button>
              <Button variant="outline" className="!text-error-500" onClick={handleDelete}>
                Delete Crew
              </Button>
            </div>
          </div>

          <NotesPanel targetType="crew" targetId={crew.id} />
        </div>
      </div>
    </>
  );
}
