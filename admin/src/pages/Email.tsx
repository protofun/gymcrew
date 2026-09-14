import { useRef, useState } from "react";
import { EmailEditor, type EditorRef } from "react-email-editor";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Radio from "../components/form/input/Radio";
import { SearchableSelect } from "../components/admin/SearchableSelect";
import { api, ApiError, type AdminUserListItem } from "../lib/api";

/**
 * A real drag-and-drop HTML email builder (Unlayer, via react-email-editor — free, MIT-licensed
 * wrapper around Unlayer's embeddable editor) instead of a plain textarea, so broadcast emails can
 * actually look like a real product email: layout blocks, images, buttons, brand colors — not just
 * a wall of text. `exportHtml` below is how the finished design becomes the HTML the backend mails
 * out (see backend/routes/admin.php's sendBroadcastEmail — sends multipart, HTML + a plain-text
 * fallback derived from it).
 */
export default function Email() {
  const editorRef = useRef<EditorRef>(null);
  const [audience, setAudience] = useState<"all" | "single" | "founding">("all");
  const [recipient, setRecipient] = useState<AdminUserListItem | null>(null);
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [sending, setSending] = useState(false);

  function handleSend() {
    if (!subject.trim()) {
      setError("Add a subject line first.");
      return;
    }
    if (audience === "single" && !recipient) {
      setError("Search for and pick a recipient first.");
      return;
    }
    if (audience === "all" && !window.confirm("Send this email to every user? This can't be undone.")) return;

    editorRef.current?.editor?.exportHtml(async (data) => {
      const html = data.html;
      const textOnly = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (!textOnly) {
        setError("The email body is empty — add some content in the editor first.");
        return;
      }

      setSending(true);
      setError(null);
      setResult(null);
      try {
        const res = await api.sendBroadcastEmail(subject.trim(), "", html, audience, audience === "single" ? recipient?.id : undefined);
        setResult({ sent: res.sent, total: res.total });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to send email");
      } finally {
        setSending(false);
      }
    });
  }

  return (
    <>
      <PageMeta title="Send Email | GymCrew Admin" description="Send a professional email to GymCrew users" />
      <PageBreadcrumb pageTitle="Send Email" />

      <div className="mb-5 grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-3">
        <div>
          <Label>Send To</Label>
          <div className="flex flex-wrap gap-4 pt-2">
            <Radio id="audience-all" name="audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} label="All users" />
            <Radio id="audience-founding" name="audience" value="founding" checked={audience === "founding"} onChange={() => setAudience("founding")} label="Founding athletes" />
            <Radio id="audience-single" name="audience" value="single" checked={audience === "single"} onChange={() => setAudience("single")} label="One user" />
          </div>
        </div>
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
        </div>
        {audience === "single" ? (
          <div>
            <Label>Recipient</Label>
            <SearchableSelect<AdminUserListItem>
              value={recipient}
              onSelect={setRecipient}
              search={(q) => api.getUsers({ search: q, limit: 8 }).then((r) => r.users)}
              getId={(u) => u.id}
              getLabel={(u) => u.fullName || u.email || u.id}
              getSubLabel={(u) => u.email}
              placeholder="Search users by name or email…"
            />
          </div>
        ) : (
          <div className="flex items-end">
            <Button className="w-full" size="sm" onClick={handleSend} disabled={sending}>
              {sending ? "Sending…" : "Send Email"}
            </Button>
          </div>
        )}
      </div>

      {audience === "single" && (
        <div className="mb-5">
          <Button size="sm" onClick={handleSend} disabled={sending}>
            {sending ? "Sending…" : "Send Email"}
          </Button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}
      {result && (
        <p className="mb-4 text-sm text-success-500">
          Sent to {result.sent} of {result.total} recipients.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <EmailEditor ref={editorRef} minHeight={640} options={{ appearance: { theme: "light" } }} />
      </div>
    </>
  );
}
