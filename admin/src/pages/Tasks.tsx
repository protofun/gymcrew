import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { EventInput } from "@fullcalendar/core";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import TextArea from "../components/form/input/TextArea";
import { api, type AdminTask, type TaskStatus } from "../lib/api";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

function TaskCard({ task }: { task: AdminTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : "auto" } : undefined;
  const overdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-xl border border-gray-200 bg-white p-3.5 shadow-theme-xs active:cursor-grabbing dark:border-gray-800 dark:bg-gray-dark"
    >
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{task.title}</p>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{task.description}</p>}
      {task.dueDate && (
        <p className={`mt-2 text-xs ${overdue ? "text-error-500" : "text-gray-400"}`}>Due {new Date(task.dueDate).toLocaleDateString()}</p>
      )}
    </div>
  );
}

function Column({ status, label, tasks, onDelete }: { status: TaskStatus; label: string; tasks: AdminTask[]; onDelete: (id: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-1 flex-col gap-3 rounded-2xl border p-4 ${
        isOver ? "border-brand-400 bg-brand-50/40 dark:bg-brand-500/5" : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</h3>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">{tasks.length}</span>
      </div>
      {tasks.map((task) => (
        <div key={task.id} className="group relative">
          <TaskCard task={task} />
          <button
            onClick={() => onDelete(task.id)}
            className="absolute right-2 top-2 hidden text-xs text-error-500 group-hover:block"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function load() {
    api.getTasks().then(setTasks).catch(() => {});
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createTask({ title: title.trim(), description: description.trim() || undefined, dueDate: dueDate || null });
    setTitle("");
    setDescription("");
    setDueDate("");
    setShowForm(false);
    load();
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this task?")) return;
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = Number(event.active.id);
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    await api.updateTask(taskId, { status: newStatus });
  }

  const calendarEvents: EventInput[] = useMemo(
    () =>
      tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: String(t.id),
          title: t.title,
          start: t.dueDate!,
          color: t.status === "done" ? "#12B76A" : t.status === "in_progress" ? "#F79009" : "#465FFF",
        })),
    [tasks],
  );

  return (
    <>
      <PageMeta title="Tasks | GymCrew Admin" description="Internal task board and calendar" />
      <PageBreadcrumb pageTitle="Tasks" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant={view === "board" ? "primary" : "outline"} onClick={() => setView("board")}>
            Board
          </Button>
          <Button size="sm" variant={view === "calendar" ? "primary" : "outline"} onClick={() => setView("calendar")}>
            Calendar
          </Button>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New Task"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" />
          </div>
          <div>
            <Label>Due Date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description (optional)</Label>
            <TextArea rows={2} value={description} onChange={setDescription} placeholder="Details…" />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" disabled={!title.trim()}>
              Create Task
            </Button>
          </div>
        </form>
      )}

      {view === "board" ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-4 md:flex-row">
            {COLUMNS.map((col) => (
              <Column key={col.status} status={col.status} label={col.label} tasks={tasks.filter((t) => t.status === col.status)} onDelete={handleDelete} />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <FullCalendar plugins={[dayGridPlugin]} initialView="dayGridMonth" events={calendarEvents} height="auto" />
        </div>
      )}
    </>
  );
}
