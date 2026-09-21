import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import { EditUserModal } from "../../components/admin/EditUserModal";
import { NotesPanel } from "../../components/admin/NotesPanel";
import { SearchableSelect } from "../../components/admin/SearchableSelect";
import { SendMessageModal } from "../../components/admin/SendMessageModal";
import { SetPasswordModal } from "../../components/admin/SetPasswordModal";
import {
  api,
  ApiError,
  type AdminCrewListItem,
  type AdminUserDetail,
  type UserActivity,
  type UserRecord,
  type UserWorkout,
} from "../../lib/api";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800 dark:text-white/90">{value ?? "—"}</p>
    </div>
  );
}

const TABS = ["Overview", "Behavior", "Ranks", "Workouts", "Crew"] as const;
type Tab = (typeof TABS)[number];

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    if (!id) return;
    api
      .getUser(id)
      .then(setUser)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load user"));
  }, [id]);

  async function toggleBan() {
    if (!user) return;
    const nextBanned = !user.banned;
    if (!window.confirm(nextBanned ? "Ban this user?" : "Unban this user?")) return;
    await api.setUserBanned(user.id, nextBanned);
    setUser({ ...user, banned: nextBanned });
    toast.success(nextBanned ? "User banned" : "User unbanned");
  }

  async function handleDelete() {
    if (!user) return;
    if (!window.confirm(`Permanently delete ${user.email ?? user.id}? This cannot be undone.`)) return;
    await api.deleteUser(user.id);
    toast.success("User deleted");
    navigate("/users");
  }

  if (error) return <p className="text-sm text-error-500">{error}</p>;
  if (!user) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <>
      <PageMeta title={`${user.fullName ?? user.email ?? "User"} | GymCrew Admin`} description="User detail" />
      <PageBreadcrumb pageTitle={user.fullName || user.email || "User"} />

      <div className="mb-5 flex items-center gap-3">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {(user.fullName || user.email || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h2 className="text-base font-medium text-gray-800 dark:text-white/90">{user.fullName || user.email || "User"}</h2>
          <Badge size="sm" color={user.banned ? "error" : "success"}>
            {user.banned ? "Banned" : "Active"}
          </Badge>
        </div>
      </div>

      <div className="mb-5 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab user={user} onUserChange={setUser} onToggleBan={toggleBan} onDelete={handleDelete} />}
      {tab === "Behavior" && <BehaviorTab userId={user.id} />}
      {tab === "Ranks" && <RanksTab userId={user.id} />}
      {tab === "Workouts" && <WorkoutsTab userId={user.id} />}
      {tab === "Crew" && <CrewTab user={user} onUserChange={setUser} />}
    </>
  );
}

function OverviewTab({
  user,
  onUserChange,
  onToggleBan,
  onDelete,
}: {
  user: AdminUserDetail;
  onUserChange: (user: AdminUserDetail) => void;
  onToggleBan: () => void;
  onDelete: () => void;
}) {
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function handleSignOut() {
    if (!window.confirm(`Sign ${user.email ?? user.id} out of all their devices? They can sign back in with their password.`)) return;
    try {
      const { revoked } = await api.signOutUser(user.id);
      toast.success(revoked === 0 ? "No active sessions to sign out" : `Signed out of ${revoked} session${revoked === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to sign the user out");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
        <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Profile</h3>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Field label="Full Name" value={user.fullName} />
          <Field label="Username" value={user.username ? `@${user.username}` : null} />
          <Field label="Email" value={user.email} />
          <Field label="Gender" value={user.gender} />
          <Field label="Height" value={user.heightCm ? `${user.heightCm} cm` : null} />
          <Field label="Weight" value={user.weightKg ? `${user.weightKg} kg` : null} />
          <Field label="Age" value={user.age} />
          <Field label="Gym" value={user.gymName} />
          <Field label="Goal" value={user.goal} />
          <Field label="Experience" value={user.experienceLevel} />
          <Field label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
          <Field label="Push Notifications" value={user.hasPushToken ? "Enabled" : "Not registered"} />
          <Field label="Founding Athlete" value={user.isFoundingAthlete ? "Yes" : "No"} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Activity</h3>
          <Field label="Workouts Logged" value={user.workoutCount} />
          <div className="mt-4">
            <Field
              label="Crew"
              value={user.crew ? <Link to={`/crews/${user.crew.id}`} className="text-brand-500 hover:underline">{user.crew.name} ({user.crew.role})</Link> : "No crew"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Actions</h3>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit Profile
            </Button>
            <Button variant="outline" onClick={() => setPasswordOpen(true)}>
              Set New Password
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out Everywhere
            </Button>
            <Button variant="outline" onClick={() => setMessageModalOpen(true)}>
              Send Message
            </Button>
            <Button variant="outline" onClick={onToggleBan}>
              {user.banned ? "Unban User" : "Ban User"}
            </Button>
            <Button variant="outline" className="!text-error-500" onClick={onDelete}>
              Delete Account
            </Button>
          </div>
        </div>

        <NotesPanel targetType="user" targetId={user.id} />
      </div>

      <SendMessageModal isOpen={messageModalOpen} onClose={() => setMessageModalOpen(false)} userIds={[user.id]} />
      <EditUserModal isOpen={editOpen} onClose={() => setEditOpen(false)} user={user} onSaved={onUserChange} />
      <SetPasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} userId={user.id} userLabel={user.email ?? user.id} />
    </div>
  );
}

function BehaviorTab({ userId }: { userId: string }) {
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getUserActivity(userId)
      .then(setActivity)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load activity"));
  }, [userId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-error-500 bg-error-50 p-6 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500">
        Couldn&apos;t load activity: {error}. If you just deployed this feature, make sure{" "}
        <code className="rounded bg-black/5 px-1 dark:bg-white/10">backend/db/schema.sql</code> has been re-imported.
      </div>
    );
  }

  if (!activity) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Recent Activity</h3>
      {activity.events.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No recorded activity yet.</p>
      ) : (
        <div className="space-y-2">
          {activity.events.map((e, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0 dark:border-gray-800">
              <div>
                <span className="font-medium text-gray-800 dark:text-white/90">{e.event}</span>
                {e.label && <span className="ml-2 text-gray-500 dark:text-gray-400">{e.label}</span>}
              </div>
              <span className="text-xs text-gray-400">{new Date(e.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RanksTab({ userId }: { userId: string }) {
  const [records, setRecords] = useState<UserRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");

  function load() {
    api
      .getUserRecords(userId)
      .then(setRecords)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load records"));
  }

  useEffect(load, [userId]);

  function startEdit(r: UserRecord) {
    setEditing(r.exerciseId);
    setWeightKg(String(r.weightKg));
    setReps(String(r.reps));
  }

  async function saveEdit(exerciseId: string) {
    try {
      await api.updateUserRecord(userId, exerciseId, Number(weightKg), Number(reps));
      toast.success("Record updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update record");
    }
  }

  async function deleteRecord(exerciseId: string) {
    if (!window.confirm("Delete this record?")) return;
    await api.deleteRecord(userId, exerciseId);
    toast.success("Record deleted");
    load();
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error-500 bg-error-50 p-6 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500">
        Couldn&apos;t load records: {error}
      </div>
    );
  }

  if (!records) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">Exercise</th>
            <th className="px-4 py-3">Best Weight</th>
            <th className="px-4 py-3">Reps</th>
            <th className="px-4 py-3">Achieved</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                No personal records yet.
              </td>
            </tr>
          )}
          {records.map((r) => (
            <tr key={r.exerciseId} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <td className="px-4 py-3 text-gray-800 dark:text-white/90">{r.exerciseName}</td>
              {editing === r.exerciseId ? (
                <>
                  <td className="px-4 py-2">
                    <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                  </td>
                  <td className="px-4 py-2">
                    <Input type="number" value={reps} onChange={(e) => setReps(e.target.value)} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(r.achievedAt).toLocaleDateString()}</td>
                  <td className="flex gap-2 px-4 py-2">
                    <Button size="sm" onClick={() => saveEdit(r.exerciseId)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-3 text-gray-800 dark:text-white/90">{r.weightKg} kg</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-white/90">{r.reps}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(r.achievedAt).toLocaleDateString()}</td>
                  <td className="flex gap-3 px-4 py-3">
                    <button className="text-xs text-brand-500 hover:underline" onClick={() => startEdit(r)}>
                      Edit
                    </button>
                    <button className="text-xs text-error-500 hover:underline" onClick={() => deleteRecord(r.exerciseId)}>
                      Delete
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkoutsTab({ userId }: { userId: string }) {
  const [workouts, setWorkouts] = useState<UserWorkout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getUserWorkouts(userId)
      .then(setWorkouts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load workouts"));
  }, [userId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-error-500 bg-error-50 p-6 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500">
        Couldn&apos;t load workouts: {error}
      </div>
    );
  }

  if (!workouts) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 text-left text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3">Workout</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Volume</th>
            <th className="px-4 py-3">Sets</th>
          </tr>
        </thead>
        <tbody>
          {workouts.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                No workouts logged yet.
              </td>
            </tr>
          )}
          {workouts.map((w) => (
            <tr key={w.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <td className="px-4 py-3 text-gray-800 dark:text-white/90">{w.name}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(w.completedAt).toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{Math.round(w.durationSeconds / 60)} min</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{w.volumeKg.toLocaleString()} kg</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{w.completedSets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrewTab({ user, onUserChange }: { user: AdminUserDetail; onUserChange: (u: AdminUserDetail) => void }) {
  const [selectedCrew, setSelectedCrew] = useState<AdminCrewListItem | null>(null);
  const [saving, setSaving] = useState(false);

  async function move(crewId: string | null) {
    setSaving(true);
    try {
      await api.moveUserCrew(user.id, crewId);
      const refreshed = await api.getUser(user.id);
      onUserChange(refreshed);
      setSelectedCrew(null);
      toast.success(crewId ? "User moved to crew" : "User removed from crew");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update crew");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Crew Membership</h3>

      <Field
        label="Current Crew"
        value={user.crew ? <Link to={`/crews/${user.crew.id}`} className="text-brand-500 hover:underline">{user.crew.name} ({user.crew.role})</Link> : "No crew"}
      />

      {user.crew && (
        <Button className="mt-4" variant="outline" disabled={saving} onClick={() => move(null)}>
          Remove From Crew
        </Button>
      )}

      <div className="mt-6">
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Move to a different crew</p>
        <SearchableSelect<AdminCrewListItem>
          value={selectedCrew}
          onSelect={setSelectedCrew}
          search={(q) => api.getCrews({ search: q, limit: 8 }).then((r) => r.crews)}
          getId={(c) => c.id}
          getLabel={(c) => c.name}
          getSubLabel={(c) => `${c.memberCount} members`}
          placeholder="Search crews by name…"
        />
        {selectedCrew && (
          <Button className="mt-3" size="sm" disabled={saving} onClick={() => move(selectedCrew.id)}>
            Move to &quot;{selectedCrew.name}&quot;
          </Button>
        )}
      </div>
    </div>
  );
}
