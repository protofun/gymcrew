import { useState } from "react";
import { toast } from "sonner";

import Label from "../form/Label";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { api, ApiError } from "../../lib/api";

/** Pre-written starting points — the admin can still edit the text after picking one, this just
 * saves retyping the common cases. */
const MESSAGE_TEMPLATES: { value: string; label: string; text: string }[] = [
  {
    value: "promote-reminder",
    label: "Promote reminder",
    text: "We haven't seen any GymCrew posts on your Instagram or TikTok yet. We want to see you actively promoting GymCrew — otherwise you risk losing your free access once the app launches.",
  },
  {
    value: "final-warning",
    label: "Final warning",
    text: "This is a final reminder: we still haven't seen you promoting GymCrew on Instagram or TikTok. Please post about GymCrew this week to keep your free access at launch.",
  },
  {
    value: "thanks",
    label: "Thanks for promoting",
    text: "Thanks for actively promoting GymCrew — we've seen your posts and it's appreciated!",
  },
];

type SendMessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** One id sends to a single user (e.g. from their detail page); several sends to all of them at
   * once (e.g. a bulk-selected list). */
  userIds: string[];
  /** Called after a successful send, in addition to onClose — e.g. to clear a list's row selection. */
  onSent?: () => void;
};

/** Composes a message shown as a blocking-until-dismissed overlay (see AdminMessageOverlay in the
 * app) the next time each targeted user opens the app — used from both UsersList's bulk "Send
 * Message" action and UserDetail's single-user one, so the compose UI and send logic live in one
 * place instead of two. */
export function SendMessageModal({ isOpen, onClose, userIds, onSent }: SendMessageModalProps) {
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const res = await api.sendAdminMessage(userIds, messageText.trim());
      toast.success(`Sent to ${res.sent} user${res.sent === 1 ? "" : "s"}`);
      setMessageText("");
      onClose();
      onSent?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h5 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Send Message to {userIds.length} User{userIds.length === 1 ? "" : "s"}
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Shows as a blocking overlay the next time each person opens the app — they have to read it to dismiss it, unlike
            a push notification.
          </p>
        </div>

        <div>
          <Label>Template (optional)</Label>
          <Select
            options={MESSAGE_TEMPLATES.map((t) => ({ value: t.value, label: t.label }))}
            placeholder="Start from a template…"
            onChange={(value) => {
              const template = MESSAGE_TEMPLATES.find((t) => t.value === value);
              if (template) setMessageText(template.text);
            }}
          />
        </div>

        <div>
          <Label>Message</Label>
          <TextArea rows={5} value={messageText} onChange={setMessageText} placeholder="Write your own message, or pick a template above and edit it." />
        </div>

        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={sending || !messageText.trim()} onClick={handleSend}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
