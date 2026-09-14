import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router";

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import { NotesPanel } from "../../components/admin/NotesPanel";
import { api, ApiError, type AdminSupportDetail } from "../../lib/api";

export default function SupportDetail() {
  const { id } = useParams<{ id: string }>();
  const ticketId = Number(id);
  const [detail, setDetail] = useState<AdminSupportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function load() {
    api
      .getSupportDetail(ticketId)
      .then(setDetail)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load ticket"));
  }

  useEffect(load, [ticketId]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.replies.length]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.replySupportTicket(ticketId, reply.trim());
      setReply("");
      load();
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!detail) return;
    if (detail.ticket.status === "open") {
      await api.resolveSupportMessage(ticketId);
    } else {
      await api.reopenSupportMessage(ticketId);
    }
    load();
  }

  if (error) return <p className="text-sm text-error-500">{error}</p>;
  if (!detail) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  const { ticket, replies } = detail;

  return (
    <>
      <PageMeta title={`Ticket from ${ticket.userName} | GymCrew Admin`} description="Support conversation" />
      <PageBreadcrumb pageTitle={`Ticket #${ticket.id}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-white/[0.05]">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{ticket.userName}</p>
              {ticket.contactEmail && <p className="text-xs text-gray-400">{ticket.contactEmail}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Badge size="sm" color={ticket.status === "open" ? "warning" : "success"}>
                {ticket.status}
              </Badge>
              <Button size="sm" variant="outline" onClick={toggleStatus}>
                {ticket.status === "open" ? "Mark Resolved" : "Reopen"}
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-4 p-5" style={{ maxHeight: 520, overflowY: "auto" }}>
            {/* The ticket's original message, styled as the first "user" bubble in the thread. */}
            <ChatBubble senderType="user" body={ticket.message} createdAt={ticket.createdAt} />
            {replies.map((r) => (
              <ChatBubble key={r.id} senderType={r.senderType} body={r.body} createdAt={r.createdAt} />
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleReply} className="flex items-center gap-2 border-t border-gray-100 p-4 dark:border-white/[0.05]">
            <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to this user…" />
            <Button size="sm" disabled={sending || !reply.trim()}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </form>
        </div>

        <NotesPanel targetType="support" targetId={String(ticket.id)} />
      </div>
    </>
  );
}

function ChatBubble({ senderType, body, createdAt }: { senderType: "admin" | "user"; body: string; createdAt: number }) {
  const isAdmin = senderType === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isAdmin ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-800 dark:bg-white/[0.05] dark:text-gray-200"}`}>
        <p className="whitespace-pre-wrap">{body}</p>
        <p className={`mt-1 text-[11px] ${isAdmin ? "text-white/70" : "text-gray-400"}`}>{new Date(createdAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
