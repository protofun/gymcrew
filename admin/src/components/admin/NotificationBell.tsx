import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Dropdown } from "../ui/dropdown/Dropdown";
import { api, type AdminTask } from "../../lib/api";

/** Real counts (open reports, open support tickets, overdue/due-today tasks) — replaces the
 * template's original mock notification dropdown, which showed made-up names and was removed
 * entirely until there was real data to back it with. */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [openReports, setOpenReports] = useState(0);
  const [openSupport, setOpenSupport] = useState(0);
  const [dueTasks, setDueTasks] = useState<AdminTask[]>([]);

  useEffect(() => {
    api.getStats().then((stats) => {
      setOpenReports(stats.openReports);
      setOpenSupport(stats.openSupport);
    }).catch(() => {});

    api.getTasks().then((tasks) => {
      const today = new Date().toISOString().slice(0, 10);
      setDueTasks(tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate <= today));
    }).catch(() => {});
  }, []);

  const total = openReports + openSupport + dueTasks.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
      >
        {total > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-medium text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 1.667a5.83 5.83 0 0 0-5.833 5.833v2.253c0 .489-.146.967-.418 1.373l-1.023 1.535a1.667 1.667 0 0 0 1.388 2.593h11.772a1.667 1.667 0 0 0 1.388-2.593l-1.023-1.535a2.5 2.5 0 0 1-.417-1.373V7.5A5.83 5.83 0 0 0 10 1.667Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-[17px] flex w-[300px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <p className="px-2 pb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</p>
        {total === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">You&apos;re all caught up.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {openReports > 0 && (
              <Link to="/reports" onClick={() => setIsOpen(false)} className="rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                {openReports} open report{openReports === 1 ? "" : "s"}
              </Link>
            )}
            {openSupport > 0 && (
              <Link to="/support" onClick={() => setIsOpen(false)} className="rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                {openSupport} open support ticket{openSupport === 1 ? "" : "s"}
              </Link>
            )}
            {dueTasks.length > 0 && (
              <Link to="/tasks" onClick={() => setIsOpen(false)} className="rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                {dueTasks.length} task{dueTasks.length === 1 ? "" : "s"} due or overdue
              </Link>
            )}
          </div>
        )}
      </Dropdown>
    </div>
  );
}
