import { useEffect, useState } from "react";
import { toast } from "sonner";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Badge from "../components/ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import { api, type SocialSubmission } from "../lib/api";

function statusBadge(isPromoting: boolean | null) {
  if (isPromoting === true) return <Badge size="sm" color="success">Promoting</Badge>;
  if (isPromoting === false) return <Badge size="sm" color="error">Not Promoting</Badge>;
  return <Badge size="sm" color="light">Not Reviewed</Badge>;
}

export default function SocialVerification() {
  const [items, setItems] = useState<SocialSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getSocialSubmissions()
      .then(setItems)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleReview(item: SocialSubmission, isPromoting: boolean | null) {
    const notes = isPromoting === null ? "" : (window.prompt("Notes (optional):", item.adminNotes) ?? item.adminNotes);
    await api.reviewSocialSubmission(item.userId, isPromoting, notes);
    setItems((prev) =>
      prev.map((i) => (i.userId === item.userId ? { ...i, isPromoting, adminNotes: notes, reviewedAt: Date.now() } : i)),
    );
    toast.success(isPromoting === null ? "Cleared" : isPromoting ? "Marked as promoting" : "Marked as not promoting");
  }

  return (
    <>
      <PageMeta title="Social Verification | GymCrew Admin" description="Check who's actually promoting GymCrew" />
      <PageBreadcrumb pageTitle="Social Verification" />

      <p className="mb-4 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Instagram/TikTok handles users submitted through the app&apos;s "Connect Your Socials" prompt. Open each profile and
        check for GymCrew posts by hand, then mark it — this isn&apos;t automated.
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">User</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Instagram</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">TikTok</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Submitted</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Notes</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">No submissions yet.</TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.userId}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">{item.userName}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <a
                        href={`https://instagram.com/${item.instagramHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-500 hover:underline"
                      >
                        @{item.instagramHandle}
                      </a>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <a
                        href={`https://tiktok.com/@${item.tiktokHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-500 hover:underline"
                      >
                        @{item.tiktokHandle}
                      </a>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <div className="flex flex-col gap-1">
                        {statusBadge(item.isPromoting)}
                        {item.reviewedBy && <span className="text-xs text-gray-400">by {item.reviewedBy}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {item.adminNotes || "—"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleReview(item, true)} className="text-xs text-success-500 hover:underline">
                          Mark Promoting
                        </button>
                        <button onClick={() => handleReview(item, false)} className="text-xs text-error-500 hover:underline">
                          Mark Not Promoting
                        </button>
                        {item.isPromoting !== null && (
                          <button onClick={() => handleReview(item, null)} className="text-xs text-gray-400 hover:underline">
                            Clear
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
