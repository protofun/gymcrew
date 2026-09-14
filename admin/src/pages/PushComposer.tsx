import { useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Radio from "../components/form/input/Radio";
import TextArea from "../components/form/input/TextArea";
import { SearchableSelect } from "../components/admin/SearchableSelect";
import { api, ApiError, type AdminCrewListItem, type AdminUserListItem } from "../lib/api";

export default function PushComposer() {
  const [audience, setAudience] = useState<"all" | "crew" | "single">("all");
  const [crew, setCrew] = useState<AdminCrewListItem | null>(null);
  const [user, setUser] = useState<AdminUserListItem | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    if (audience === "all" && !window.confirm("Send this push notification to every user with notifications enabled?")) return;

    setSending(true);
    try {
      const res = await api.sendPushBroadcast(title.trim(), body.trim(), audience, audience === "crew" ? crew?.id : undefined, audience === "single" ? user?.id : undefined);
      toast.success(`Sent to ${res.sent} device${res.sent === 1 ? "" : "s"}`);
      setTitle("");
      setBody("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageMeta title="Push Notifications | GymCrew Admin" description="Send a push notification to GymCrew users" />
      <PageBreadcrumb pageTitle="Push Notifications" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Only reaches devices that have push notifications enabled and registered (see src/lib/push-notifications.ts in the app) — unlike email, this can&apos;t reach everyone.
      </p>

      <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="space-y-5">
          <div>
            <Label>Send To</Label>
            <div className="flex flex-wrap gap-4 pt-1">
              <Radio id="push-all" name="push-audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} label="All users" />
              <Radio id="push-crew" name="push-audience" value="crew" checked={audience === "crew"} onChange={() => setAudience("crew")} label="One crew" />
              <Radio id="push-single" name="push-audience" value="single" checked={audience === "single"} onChange={() => setAudience("single")} label="One user" />
            </div>
          </div>

          {audience === "crew" && (
            <div>
              <Label>Crew</Label>
              <SearchableSelect<AdminCrewListItem>
                value={crew}
                onSelect={setCrew}
                search={(q) => api.getCrews({ search: q, limit: 8 }).then((r) => r.crews)}
                getId={(c) => c.id}
                getLabel={(c) => c.name}
                getSubLabel={(c) => `${c.memberCount} members`}
                placeholder="Search crews by name…"
              />
            </div>
          )}
          {audience === "single" && (
            <div>
              <Label>User</Label>
              <SearchableSelect<AdminUserListItem>
                value={user}
                onSelect={setUser}
                search={(q) => api.getUsers({ search: q, limit: 8 }).then((r) => r.users)}
                getId={(u) => u.id}
                getLabel={(u) => u.fullName || u.email || u.id}
                getSubLabel={(u) => u.email}
                placeholder="Search users by name or email…"
              />
            </div>
          )}

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
          </div>
          <div>
            <Label>Message</Label>
            <TextArea rows={4} value={body} onChange={setBody} placeholder="Keep it short — this shows in the OS notification." />
          </div>

          <Button
            size="sm"
            disabled={sending || !title.trim() || !body.trim() || (audience === "crew" && !crew) || (audience === "single" && !user)}
            onClick={handleSend}
          >
            {sending ? "Sending…" : "Send Push Notification"}
          </Button>
        </div>
      </div>
    </>
  );
}
