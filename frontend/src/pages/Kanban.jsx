import { useEffect, useMemo, useState } from 'react'
import { getClients, updateClientStatus, getTasks, createTask, updateTask, updateTaskStatus, deleteTask } from '../api'
import { updateClient } from '../api'
import { Plus, Trash2, ChevronLeft, ChevronRight, Bell, Pencil, X } from 'lucide-react'

const TASK_COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in progress', label: 'In Progress' },
  { key: 'done', label: 'Done' }
]

const CLIENT_COLUMNS = [
  { key: 'in progress', label: 'In Progress' },
  { key: 'stalled', label: 'Stalled' },
  { key: 'completed', label: 'Completed' }
]

const taskColStyle = {
  todo: 'border-slate-200',
  'in progress': 'border-blue-200',
  done: 'border-green-200'
}

function nextStatus(current, direction, statuses) {
  const idx = statuses.indexOf(current)
  if (idx === -1) return current
  const next = idx + direction
  if (next < 0 || next >= statuses.length) return current
  return statuses[next]
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Kanban() {
  const [clients, setClients] = useState([])
  const [tasks, setTasks] = useState([])
  const [editTask, setEditTask] = useState(null)
  const [dateInputMode, setDateInputMode] = useState({ due: false, reminder: false })
  const [newTask, setNewTask] = useState({
    title: '',
    client_id: '',
    due_date: '',
    reminder_date: ''
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [clientRes, taskRes] = await Promise.all([getClients(), getTasks()])
    setClients(clientRes.data)
    setTasks(taskRes.data)
  }

  async function moveClient(client, direction) {
    const statuses = CLIENT_COLUMNS.map(c => c.key)
    const newStatus = nextStatus(client.status, direction, statuses)
    if (newStatus === client.status) return

    await updateClientStatus(client.id, newStatus)
    localStorage.setItem('clients:last_status_update', String(Date.now()))
    await updateClient(client.id, {
      name: client.name,
      project: client.project,
      status: newStatus,
      last_contact: client.last_contact?.slice(0, 10),
      payment_status: client.payment_status
    })

    await fetchAll()
  }

  async function handleCreateTask() {
    if (!newTask.title.trim()) return

    await createTask({
      title: newTask.title,
      client_id: newTask.client_id ? Number(newTask.client_id) : null,
      status: 'todo',
      due_date: newTask.due_date || null,
      reminder_date: newTask.reminder_date || null
    })

    setNewTask({ title: '', client_id: '', due_date: '', reminder_date: '' })
    await fetchAll()
  }

  async function moveTask(task, direction) {
    const statuses = TASK_COLUMNS.map(c => c.key)
    const newStatus = nextStatus(task.status, direction, statuses)
    if (newStatus === task.status) return
    await updateTaskStatus(task.id, newStatus)
    await fetchAll()
  }

  function openTaskEditor(task) {
    setEditTask({
      ...task,
      client_id: task.client_id ? String(task.client_id) : '',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      reminder_date: task.reminder_date ? task.reminder_date.slice(0, 10) : ''
    })
  }

  async function handleEditTask() {
    if (!editTask?.title?.trim()) return

    await updateTask(editTask.id, {
      title: editTask.title,
      client_id: editTask.client_id ? Number(editTask.client_id) : null,
      status: editTask.status,
      due_date: editTask.due_date || null,
      reminder_date: editTask.reminder_date || null
    })

    setEditTask(null)
    await fetchAll()
  }

  const reminders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return tasks.filter(t => t.status !== 'done' && t.reminder_date && t.reminder_date <= today)
  }, [tasks])

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kanban + Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">Client status board stays in sync with the Clients page.</p>
      </div>

      {/* Create Task */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3">Add Task & Reminder</p>
        <div className="grid md:grid-cols-5 gap-3">
          <input
            value={newTask.title}
            onChange={e => setNewTask(v => ({ ...v, title: e.target.value }))}
            placeholder="Task title"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newTask.client_id}
            onChange={e => setNewTask(v => ({ ...v, client_id: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">No client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 px-1">Due data</p>
            <input
              type={dateInputMode.due || newTask.due_date ? 'date' : 'text'}
              value={newTask.due_date}
              onChange={e => setNewTask(v => ({ ...v, due_date: e.target.value }))}
              onFocus={() => setDateInputMode(v => ({ ...v, due: true }))}
              onBlur={() => setDateInputMode(v => ({ ...v, due: false }))}
              placeholder="Due data"
              title="Due data"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 px-1">Reminder</p>
            <input
              type={dateInputMode.reminder || newTask.reminder_date ? 'date' : 'text'}
              value={newTask.reminder_date}
              onChange={e => setNewTask(v => ({ ...v, reminder_date: e.target.value }))}
              onFocus={() => setDateInputMode(v => ({ ...v, reminder: true }))}
              onBlur={() => setDateInputMode(v => ({ ...v, reminder: false }))}
              placeholder="Reminder"
              title="Reminder"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
            />
          </div>
          <button
            onClick={handleCreateTask}
            className="bg-gray-900 text-white rounded-lg text-sm font-medium px-3 py-2 hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Reminder list */}
      <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Bell size={15} /> Active Reminders</p>
        {reminders.length === 0 ? (
          <p className="text-sm text-gray-500">No reminders due right now.</p>
        ) : (
          <div className="space-y-2">
            {reminders.map(t => (
              <div key={t.id} className="text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <span className="font-medium">{t.title}</span>
                <span className="text-gray-500"> · {t.client_name || 'General'} · remind on {t.reminder_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task board */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Task Board</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TASK_COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key)
            return (
              <div key={col.key} className={`bg-white border-2 ${taskColStyle[col.key]} rounded-xl p-3 min-h-[220px]`}>
                <p className="text-sm font-semibold mb-3">{col.label} ({colTasks.length})</p>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div key={task.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{task.client_name || 'General task'}</p>
                      <p className="text-xs text-gray-400">Due: {task.due_date || '—'} · Reminder: {task.reminder_date || '—'}</p>
                      <div className="flex justify-between mt-2">
                        <div className="flex gap-1">
                          <button onClick={() => moveTask(task, -1)} className="p-1.5 rounded bg-white border border-gray-200"><ChevronLeft size={14} /></button>
                          <button onClick={() => moveTask(task, 1)} className="p-1.5 rounded bg-white border border-gray-200"><ChevronRight size={14} /></button>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openTaskEditor(task)} className="p-1.5 rounded bg-white border border-gray-200 text-gray-600"><Pencil size={14} /></button>
                          <button onClick={async () => { await deleteTask(task.id); await fetchAll() }} className="p-1.5 rounded bg-red-50 text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Client board (synced) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Client Project Board (Synced)</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {CLIENT_COLUMNS.map(col => {
            const colClients = clients.filter(c => c.status === col.key)
            return (
              <div key={col.key} className="bg-white border border-gray-100 rounded-xl p-3 min-h-[220px]">
                <p className="text-sm font-semibold mb-3">{col.label} ({colClients.length})</p>
                <div className="space-y-2">
                  {colClients.map(client => (
                    <div key={client.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-500">{client.project}</p>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => moveClient(client, -1)} className="p-1.5 rounded bg-white border border-gray-200"><ChevronLeft size={14} /></button>
                        <button onClick={() => moveClient(client, 1)} className="p-1.5 rounded bg-white border border-gray-200"><ChevronRight size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {editTask && (
        <Modal title="Edit Task" onClose={() => setEditTask(null)}>
          <div className="flex flex-col gap-3">
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Task title"
              value={editTask.title}
              onChange={e => setEditTask(t => ({ ...t, title: e.target.value }))}
            />
            <select
              value={editTask.client_id}
              onChange={e => setEditTask(t => ({ ...t, client_id: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">No client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={editTask.due_date}
                onChange={e => setEditTask(t => ({ ...t, due_date: e.target.value }))}
                placeholder="Due data"
                title="Due data"
                aria-label="Due data"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <input
                type="date"
                value={editTask.reminder_date}
                onChange={e => setEditTask(t => ({ ...t, reminder_date: e.target.value }))}
                placeholder="Reminder"
                title="Reminder"
                aria-label="Reminder"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleEditTask}
                disabled={!editTask.title.trim()}
                className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditTask(null)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
