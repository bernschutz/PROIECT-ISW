import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { computeStatus, nextDue, capitalize } from "../lib/taskUtils";
import clsx from "clsx";

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";

import { format } from "date-fns";
import { ro } from "date-fns/locale";

export default function Dashboard() {
  const { session } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ status: "all", priority: "all", q: "" });
  const [dueAt, setDueAt] = useState(null); // pentru Flatpickr
  const [editing, setEditing] = useState(null); // task-ul pe care îl edităm
  const [editDue, setEditDue] = useState(null); // pentru Flatpickr în modal
  const [loadingTaskId, setLoadingTaskId] = useState(null); // track which task is loading
  const [addingTask, setAddingTask] = useState(false); // track add form loading
  const [savingEdit, setSavingEdit] = useState(false); // track edit form loading
  const [error, setError] = useState(null); // track errors

  function startEdit(t) {
  setEditing(t);
  setEditDue(t.due_at ? new Date(t.due_at) : null);
}

async function saveEdit(e) {
  e.preventDefault();
  setSavingEdit(true);
  setError(null);

  const f = new FormData(e.currentTarget);
  const updates = {
    title: f.get("title"),
    description: f.get("description") || null,
    priority: f.get("priority"),
    recurrence: f.get("recurrence"),
    due_at: editDue ? new Date(editDue).toISOString() : null,
  };

  const { error: err } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", editing.id);

  setSavingEdit(false);
  if (!err) {
    // update instant UI
    setTasks(prev =>
      prev.map(t => t.id === editing.id ? { ...t, ...updates } : t)
    );
    setEditing(null);
  } else {
    setError(err.message);
    setTimeout(() => setError(null), 5000);
  }
}


  async function load() {
    const { data, error: err } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (!err) setTasks((data || []).map(t => ({ ...t, status: computeStatus(t) })));
    else {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  }

  useEffect(() => {
    if (!session) return;
    load();
const ch = supabase
  .channel("tasks")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "tasks",
  })
  .subscribe(() => {
    load();
  });




    return () => supabase.removeChannel(ch);
  }, [session]);

  async function addTask(e) {
    e.preventDefault();
    setAddingTask(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const obj = {
      title: f.get("title"),
      description: f.get("description") || null,
      priority: f.get("priority"),
      due_at: dueAt ? new Date(dueAt).toISOString() : null, // ← folosim selecția din Flatpickr
      recurrence: f.get("recurrence"),
      user_id: session.user.id,
    };
    const { error: err, data } = await supabase.from("tasks").insert(obj).select().single();
    setAddingTask(false);
    if (!err && data) {
      setTasks(prev => [data, ...prev]);
      e.currentTarget.reset();
      setDueAt(null); // reset date-time picker
    } else if (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  }

async function toggleComplete(t) {
  setLoadingTaskId(t.id);
  setError(null);
  let newStatus;

  if (t.status === "completed") {
    // dacă era completed → revenim la status real
    newStatus = computeStatus({ ...t, status: null });
  } else {
    newStatus = "completed";
  } 

  const updates = { status: newStatus };

  // dacă este recurent și îl marcăm "completed"
  if (newStatus === "completed" && t.recurrence !== "none") {
    const due = nextDue(t.due_at, t.recurrence);
    if (due) {
      const { error: err } = await supabase.from("tasks").insert({
        user_id: t.user_id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_at: due.toISOString(),
        recurrence: t.recurrence,
      });
      if (err) {
        setError(err.message);
        setLoadingTaskId(null);
        setTimeout(() => setError(null), 5000);
        return;
      }
    }
  }

  const { error: err } = await supabase.from("tasks").update(updates).eq("id", t.id);
  if (err) {
    setError(err.message);
    setLoadingTaskId(null);
    setTimeout(() => setError(null), 5000);
    return;
  }

  // force refresh
  await load();
  setLoadingTaskId(null);
}


async function delTask(id) {
  const ok = window.confirm("Ești sigur că vrei să ștergi task-ul?");
  if (!ok) return;

  setLoadingTaskId(id);
  setError(null);
  const { error: err } = await supabase.from("tasks").delete().eq("id", id);

  setLoadingTaskId(null);
  if (!err) {
    setTasks(prev => prev.filter(t => t.id !== id));
  } else {
    setError(err.message);
    setTimeout(() => setError(null), 5000);
  }
}
async function cancelTask(t) {
  setLoadingTaskId(t.id);
  setError(null);
  // dacă e deja canceled → revenim la statusul normal
  const newStatus =
    t.status === "canceled"
      ? computeStatus({ ...t, status: null })
      : "canceled";

  // update în DB
  const { error: err } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", t.id);

  setLoadingTaskId(null);
  if (!err) {
    // update instant în UI
    setTasks(prev =>
      prev.map(x =>
        x.id === t.id ? { ...x, status: newStatus } : x
      )
    );
  } else {
    setError(err.message);
    setTimeout(() => setError(null), 5000);
  }
}


  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filters.status !== "all" && computeStatus(t) !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.q && !(`${t.title} ${t.description || ""}`.toLowerCase().includes(filters.q.toLowerCase()))) return false;
      return true;
    });
  }, [tasks, filters]);

  return (
    <div className="wrap">
      {error && (
        <div style={{ background: "#9b2b2b", color: "white", padding: "12px 16px", borderRadius: "4px", marginBottom: "12px", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}
      <div className="card">
        <form className="add" onSubmit={addTask}>
          <input name="title" className="input" placeholder="Titlu" required />
          <input name="description" className="input" placeholder="Descriere" />

          <Flatpickr
            options={{ enableTime: true, time_24hr: true, dateFormat: "d/m/Y H:i" }}
            value={dueAt}
            onChange={(dates) => setDueAt(dates?.[0] || null)}
            className="input dt"
            placeholder="dd/mm/yyyy hh:mm"
          />

          <select name="priority" className="input" defaultValue="medium">
            <option value="low">Mica</option>
            <option value="medium">Medie</option>
            <option value="high">Mare</option>
          </select>

          <select name="recurrence" className="input" defaultValue="none">
            <option value="none">Fără</option>
            <option value="daily">Zilnic</option>
            <option value="weekly">Săptămânal</option>
            <option value="monthly">Lunar</option>
          </select>

          <button className="primary" disabled={addingTask}>{addingTask ? "Se adaugă..." : "Adaugă"}</button>
        </form>

        <div className="filters">
          <select
            className="input"
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="all">Status: Toate</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>

          <select
            className="input"
            value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
          >
            <option value="all">Prioritate: Toate</option>
            <option value="low">Mica</option>
            <option value="medium">Medie</option>
            <option value="high">Mare</option>
          </select>

          <input
            className="input"
            placeholder="Caută..."
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", opacity: 0.6 }}>
          <p>No tasks found</p>
        </div>
      ) : (
        <ul className="list">
          {filtered.map(t => (
            <li key={t.id} className={clsx("item", computeStatus(t))}>
              <div className="title">{t.title}</div>
              <div className="meta">
                <span>{capitalize(t.priority)}</span>
                {t.due_at && (
                  <span>
                    Due: {format(new Date(t.due_at), "dd/MM/yyyy HH:mm", { locale: ro })}
                  </span>
                )}
                <span className={`badge ${computeStatus(t)}`}>{capitalize(computeStatus(t))}</span>
              </div>
              <p className="desc">{t.description}</p>
<div className="actions">
  <button onClick={() => toggleComplete(t)} disabled={loadingTaskId === t.id}>
    {loadingTaskId === t.id ? "..." : (t.status === "completed" ? "Undo" : "Complete")}
  </button>

  <button onClick={() => cancelTask(t)} disabled={loadingTaskId === t.id}>
    {loadingTaskId === t.id ? "..." : (t.status === "canceled" ? "Uncancel" : "Cancel")}
  </button>

  <button onClick={() => startEdit(t)} disabled={loadingTaskId === t.id}>Edit</button>

  <button onClick={() => delTask(t.id)} disabled={loadingTaskId === t.id}>
    {loadingTaskId === t.id ? "..." : "Delete"}
  </button>
</div>


            </li>
          ))}
        </ul>
      )}
      {editing && (
  <div className="modal-backdrop">
    <div className="modal">
      <h3>Edit Task</h3>

      <form onSubmit={saveEdit} className="modal-form">

        <input
          name="title"
          className="input"
          defaultValue={editing.title}
          required
        />

        <input
          name="description"
          className="input"
          defaultValue={editing.description}
        />

        <Flatpickr
          options={{ enableTime: true, time_24hr: true, dateFormat: "d/m/Y H:i" }}
          value={editDue}
          onChange={d => setEditDue(d?.[0] || null)}
          className="input dt"
        />

        <select
          name="priority"
          className="input"
          defaultValue={editing.priority}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          name="recurrence"
          className="input"
          defaultValue={editing.recurrence}
        >
          <option value="none">Fără</option>
          <option value="daily">Zilnic</option>
          <option value="weekly">Săptămânal</option>
          <option value="monthly">Lunar</option>
        </select>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={() => setEditing(null)} disabled={savingEdit}>
            Închide
          </button>
          <button type="submit" className="primary" disabled={savingEdit}>
            {savingEdit ? "Se salvează..." : "Salvează"}
          </button>
        </div>

      </form>
    </div>
  </div>
)}

    </div>
  );
}
