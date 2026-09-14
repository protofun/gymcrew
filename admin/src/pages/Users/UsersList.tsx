import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";
import { api, ApiError, type AdminUserListItem, type UsersFilter } from "../../lib/api";
import { formatTimeAgo } from "../../lib/format";

const LIMIT = 25;
const columnHelper = createColumnHelper<AdminUserListItem>();

const FILTERS: { key: UsersFilter | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "active_today", label: "Active Today" },
  { key: "new", label: "New Users" },
  { key: "no_workout", label: "No Workout" },
  { key: "no_crew", label: "No Crew" },
  { key: "no_return", label: "No Return Visit" },
  { key: "pwa_installed", label: "PWA Installed" },
  { key: "pwa_not_installed", label: "PWA Not Installed" },
];

function Avatar({ name }: { name: string | null }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">{initial}</span>
  );
}

export default function UsersList() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UsersFilter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const load = useCallback((searchValue: string, pageValue: number, filterValue: UsersFilter | null) => {
    setLoading(true);
    setRowSelection({});
    api
      .getUsers({ search: searchValue, page: pageValue, limit: LIMIT, filter: filterValue ?? undefined })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(search, page, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(search, 1, filter);
  }

  function handleFilterClick(next: UsersFilter | null) {
    setFilter(next);
    setPage(1);
  }

  async function toggleBan(user: AdminUserListItem) {
    const nextBanned = !user.banned;
    if (!window.confirm(nextBanned ? `Ban ${user.email ?? user.id}?` : `Unban ${user.email ?? user.id}?`)) return;
    await api.setUserBanned(user.id, nextBanned);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, banned: nextBanned } : u)));
    toast.success(nextBanned ? "User banned" : "User unbanned");
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
        ),
        cell: ({ row }) => <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
      }),
      columnHelper.accessor("fullName", {
        header: "Name",
        cell: (info) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={info.getValue()} />
            <Link to={`/users/${info.row.original.id}`} className="font-medium text-gray-800 hover:underline dark:text-white/90">
              {info.getValue() || "—"}
            </Link>
            {info.row.original.isFoundingAthlete && (
              <Badge size="sm" color="primary" variant="light">
                Founding
              </Badge>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("email", { header: "Email", cell: (info) => info.getValue() || "—" }),
      columnHelper.accessor("gymName", { header: "Gym", cell: (info) => info.getValue() || "—" }),
      columnHelper.accessor("createdAt", { header: "Joined", cell: (info) => new Date(info.getValue()).toLocaleDateString() }),
      columnHelper.accessor("lastActiveAt", {
        header: "Last Active",
        cell: (info) => {
          const v = info.getValue();
          return v ? formatTimeAgo(v) : "Never";
        },
      }),
      columnHelper.accessor("sessionCount", { header: "Sessions", cell: (info) => info.getValue() }),
      columnHelper.accessor("workoutCount", { header: "Workouts", cell: (info) => info.getValue() }),
      columnHelper.accessor("prCount", { header: "PRs", cell: (info) => info.getValue() }),
      columnHelper.accessor("crewName", {
        header: "Crew",
        cell: (info) => info.getValue() || <span className="text-gray-400">No crew</span>,
      }),
      columnHelper.accessor("division", {
        header: "Rank",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("mealCount", { header: "Meals", cell: (info) => info.getValue() }),
      columnHelper.accessor("devicePlatform", {
        header: "Device",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("pwaInstalled", {
        header: "PWA",
        cell: (info) =>
          info.getValue() ? (
            <Badge size="sm" color="success">
              Installed
            </Badge>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      }),
      columnHelper.accessor("banned", {
        header: "Status",
        cell: (info) => (
          <Badge size="sm" color={info.getValue() ? "error" : "success"}>
            {info.getValue() ? "Banned" : "Active"}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button size="sm" variant="outline" onClick={() => toggleBan(row.original)}>
            {row.original.banned ? "Unban" : "Ban"}
          </Button>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  async function bulkBan(banned: boolean) {
    if (!window.confirm(`${banned ? "Ban" : "Unban"} ${selectedIds.length} selected user(s)?`)) return;
    await Promise.all(selectedIds.map((id) => api.setUserBanned(id, banned)));
    toast.success(`${selectedIds.length} user(s) ${banned ? "banned" : "unbanned"}`);
    load(search, page, filter);
  }

  async function bulkDelete() {
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected user(s)? This cannot be undone.`)) return;
    await Promise.all(selectedIds.map((id) => api.deleteUser(id)));
    toast.success(`${selectedIds.length} user(s) deleted`);
    load(search, page, filter);
  }

  function exportSelected() {
    const rows = selectedUsers.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      username: u.username,
      gymName: u.gymName,
      createdAt: new Date(u.createdAt).toISOString(),
      banned: u.banned,
      workoutCount: u.workoutCount,
      prCount: u.prCount,
      mealCount: u.mealCount,
      sessionCount: u.sessionCount,
      lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
      crewName: u.crewName,
      division: u.division,
      devicePlatform: u.devicePlatform,
      pwaInstalled: u.pwaInstalled,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gymcrew-selected-users.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageMeta title="Users | GymCrew Admin" description="Manage GymCrew users" />
      <PageBreadcrumb pageTitle="Users" />

      <form onSubmit={handleSearchSubmit} className="mb-4 flex max-w-sm gap-2">
        <Input placeholder="Search name, email, username…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button size="sm" variant="outline">
          Search
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => handleFilterClick(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-error-500">{error}</p>}

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-500/10">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkBan(true)}>
            Ban Selected
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkBan(false)}>
            Unban Selected
          </Button>
          <Button size="sm" variant="outline" onClick={exportSelected}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" className="!text-error-500" onClick={bulkDelete}>
            Delete Selected
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 dark:border-white/[0.05]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${header.column.getCanSort() ? "cursor-pointer select-none" : ""}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={16}>
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-sm text-gray-500 dark:text-gray-400" colSpan={16}>
                    No users found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4 text-start text-theme-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Page {page} of {totalPages} ({total} users)
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
