import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const PAGES: { label: string; path: string; group: string }[] = [
  { label: "Dashboard", path: "/", group: "Overview" },
  { label: "Analytics & Errors", path: "/analytics", group: "Overview" },
  { label: "Workout Analytics", path: "/workout-analytics", group: "Overview" },
  { label: "Crew Analytics", path: "/crew-analytics", group: "Overview" },
  { label: "Ranking Analytics", path: "/ranking-analytics", group: "Overview" },
  { label: "Retention", path: "/retention", group: "Overview" },
  { label: "Journal", path: "/journal", group: "Overview" },
  { label: "Audit Log", path: "/audit-log", group: "Overview" },
  { label: "Users", path: "/users", group: "Manage" },
  { label: "Crews", path: "/crews", group: "Manage" },
  { label: "Reports", path: "/reports", group: "Manage" },
  { label: "Support", path: "/support", group: "Manage" },
  { label: "Rank Moderation", path: "/rank-moderation", group: "Manage" },
  { label: "Social Verification", path: "/social-verification", group: "Manage" },
  { label: "Crew Wars", path: "/crew-wars", group: "Manage" },
  { label: "Tasks", path: "/tasks", group: "Team" },
  { label: "Roadmap", path: "/roadmap", group: "Team" },
  { label: "Changelog", path: "/changelog", group: "Team" },
  { label: "Knowledge Base", path: "/faq", group: "Team" },
  { label: "Feedback Board", path: "/feedback", group: "Team" },
  { label: "System Status", path: "/status", group: "Team" },
  { label: "Send Email", path: "/email", group: "Communicate" },
  { label: "Push Notifications", path: "/push", group: "Communicate" },
  { label: "Page Management", path: "/announcements", group: "Communicate" },
  { label: "Reports Center", path: "/reports-center", group: "Data" },
  { label: "Settings", path: "/settings", group: "Admin" },
  { label: "Admin Management", path: "/admins", group: "Admin" },
];

/** Global Cmd+K / Ctrl+K command palette — jump to any page instantly instead of hunting through
 * the sidebar. Built on cmdk (the same command-menu primitive behind Linear/Raycast-style UIs). */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    // Lets the header's visible "⌘K" button open the same palette, without lifting `open` state
    // up through AppLayout/AppHeader just for this one button.
    function handleOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("open-command-palette", handleOpenEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("open-command-palette", handleOpenEvent);
    };
  }, []);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  const groups = Array.from(new Set(PAGES.map((p) => p.group)));

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="fixed left-1/2 top-24 z-[100000] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <Command.Input
        placeholder="Jump to a page… (Esc to close)"
        className="w-full border-b border-gray-100 bg-transparent px-4 py-3.5 text-sm text-gray-800 outline-none dark:border-white/[0.05] dark:text-white/90"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No matching page.</Command.Empty>
        {groups.map((group) => (
          <Command.Group key={group} heading={group} className="px-2 py-1 text-xs font-medium uppercase text-gray-400 [&_[cmdk-group-items]]:mt-1">
            {PAGES.filter((p) => p.group === group).map((page) => (
              <Command.Item
                key={page.path}
                onSelect={() => go(page.path)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-gray-700 data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-600 dark:text-gray-300 dark:data-[selected=true]:bg-brand-500/10 dark:data-[selected=true]:text-brand-400"
              >
                {page.label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
