import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { api, ApiError, type AdminCrewListItem } from "../../lib/api";

const LIMIT = 25;

export default function CrewsList() {
  const [crews, setCrews] = useState<AdminCrewListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((searchValue: string, pageValue: number) => {
    setLoading(true);
    api
      .getCrews({ search: searchValue, page: pageValue, limit: LIMIT })
      .then((res) => {
        setCrews(res.crews);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load crews"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(search, 1);
  }

  async function toggleDisabled(crew: AdminCrewListItem) {
    const next = !crew.disabled;
    if (!window.confirm(next ? `Disable ${crew.name}?` : `Re-enable ${crew.name}?`)) return;
    await api.setCrewDisabled(crew.id, next);
    setCrews((prev) => prev.map((c) => (c.id === crew.id ? { ...c, disabled: next } : c)));
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageMeta title="Crews | GymCrew Admin" description="Manage GymCrew crews" />
      <PageBreadcrumb pageTitle="Crews" />

      <form onSubmit={handleSearchSubmit} className="mb-4 flex max-w-sm gap-2">
        <Input placeholder="Search crew name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button size="sm" variant="outline">
          Search
        </Button>
      </form>

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Name</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Privacy</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Members</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Division</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Created</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">Loading…</TableCell>
                </TableRow>
              ) : crews.length === 0 ? (
                <TableRow>
                  <TableCell className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400">No crews found.</TableCell>
                </TableRow>
              ) : (
                crews.map((crew) => (
                  <TableRow key={crew.id}>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Link to={`/crews/${crew.id}`} className="font-medium text-gray-800 hover:underline dark:text-white/90">
                        {crew.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400 capitalize">{crew.privacy}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{crew.memberCount}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{crew.division}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-500 dark:text-gray-400">{new Date(crew.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Badge size="sm" color={crew.disabled ? "error" : "success"}>
                        {crew.disabled ? "Disabled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-start text-theme-sm">
                      <Button size="sm" variant="outline" onClick={() => toggleDisabled(crew)}>
                        {crew.disabled ? "Enable" : "Disable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Page {page} of {totalPages} ({total} crews)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
