import { useEffect, useState } from 'react'
import {
  getClients, createClient, updateClient, deleteClient,
  getClientLogs, addClientLog, setInvoice, draftEmail,
  uploadFile, getFiles
} from '../api'
import {
  Plus, Eye, Pencil, FileText, Mail, Trash2,
  ChevronDown, ChevronUp, Loader2, X, Check, Upload
} from 'lucide-react'

const STATUS_OPTIONS  = ['in progress', 'stalled', 'completed']
const PAYMENT_OPTIONS = ['pending', 'paid']

const statusStyle = {
  'in progress': 'bg-blue-100 text-blue-700',
  'stalled':     'bg-amber-100 text-amber-700',
  'completed':   'bg-green-100 text-green-700',
}

function Badge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
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

function ClientForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    name:           initial.name           || '',
    project:        initial.project        || '',
    status:         initial.status         || 'in progress',
    last_contact:   initial.last_contact?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    payment_status: initial.payment_status || 'pending',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex flex-col gap-3">
      <input
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        placeholder="Client name"
        value={form.name}
        onChange={e => set('name', e.target.value)}
      />
      <input
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        placeholder="Project"
        value={form.project}
        onChange={e => set('project', e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={form.status}
          onChange={e => set('status', e.target.value)}
        >
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={form.payment_status}
          onChange={e => set('payment_status', e.target.value)}
        >
          {PAYMENT_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <input
        type="date"
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        value={form.last_contact}
        onChange={e => set('last_contact', e.target.value)}
      />
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onSave(form)}
          disabled={loading || !form.name || !form.project}
          className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Clients() {
  const [clients,      setClients]      = useState([])
  const [files,        setFiles]        = useState([])
  const [expanded,     setExpanded]     = useState(null)
  const [showAdd,      setShowAdd]      = useState(false)
  const [editClient,   setEditClient]   = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [logClient,    setLogClient]    = useState(null)
  const [emailClient,  setEmailClient]  = useState(null)
  const [logs,         setLogs]         = useState({})
  const [logNote,      setLogNote]      = useState('')
  const [logDate,      setLogDate]      = useState(new Date().toISOString().slice(0, 10))
  const [emailReq,     setEmailReq]     = useState('')
  const [emailDraft,   setEmailDraft]   = useState('')
  const [invoiceVal,   setInvoiceVal]   = useState({})
  const [loading,      setLoading]      = useState(false)
  const [filter,       setFilter]       = useState({ status: 'All', payment: 'All' })
  const [uploading,    setUploading]    = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [c, f] = await Promise.all([getClients(), getFiles()])
    setClients(c.data)
    setFiles(f.data)
    const inv = {}
    c.data.forEach(cl => { inv[cl.id] = cl.invoice_amount || 0 })
    setInvoiceVal(inv)
  }

  async function fetchLogs(id) {
    const res = await getClientLogs(id)
    setLogs(l => ({ ...l, [id]: res.data }))
  }

  const filtered = clients.filter(c => {
    if (filter.status  !== 'All' && c.status         !== filter.status)  return false
    if (filter.payment !== 'All' && c.payment_status !== filter.payment) return false
    return true
  })

  async function handleAdd(form) {
    setLoading(true)
    await createClient(form)
    await fetchAll()
    setShowAdd(false)
    setLoading(false)
  }

  async function handleEdit(form) {
    setLoading(true)
    await updateClient(editClient.id, form)
    await fetchAll()
    setEditClient(null)
    setLoading(false)
  }

  async function handleDelete() {
    await deleteClient(deleteId)
    await fetchAll()
    setDeleteId(null)
  }

  async function handleAddLog() {
    if (!logNote) return
    setLoading(true)
    await addClientLog(logClient.id, { note: logNote, date: logDate })
    await fetchLogs(logClient.id)
    setLogNote('')
    setLoading(false)
  }

  async function handleDraftEmail() {
    if (!emailReq) return
    setLoading(true)
    const cl  = emailClient
    const ctx = `Project: ${cl.project}, Status: ${cl.status}, Payment: ${cl.payment_status}, Last contact: ${cl.last_contact?.slice(0,10)}`
    const res = await draftEmail({ client_name: cl.name, user_request: emailReq, client_context: ctx })
    setEmailDraft(res.data.draft)
    setLoading(false)
  }

  async function handleSaveInvoice(id) {
    await setInvoice(id, invoiceVal[id])
    await fetchAll()
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadFile(fd)
    await fetchAll()
    setUploading(false)
    alert(res.data.was_client_data
      ? `✅ ${res.data.inserted} clients added from file!`
      : '✅ File stored successfully')
  }

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!logs[id]) await fetchLogs(id)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">{clients.length} total clients</p>
        </div>
        <div className="flex items-center gap-3">
          {/* File Upload */}
          <label className={`flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Upload File
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.pdf,.pptx,.txt" onChange={handleFileUpload} />
          </label>

          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} />
            Add Client
          </button>
        </div>
      </div>

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="mb-6 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Uploaded Files</p>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">
                📄 {f.filename} · <span className="text-gray-400">{f.uploaded_at?.slice(0, 10)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Filter:</span>
        <div className="flex gap-2">
          {['All', 'in progress', 'stalled', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(f => ({ ...f, status: s }))}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter.status === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex gap-2">
          {['All', 'pending', 'paid'].map(p => (
            <button
              key={p}
              onClick={() => setFilter(f => ({ ...f, payment: p }))}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter.payment === p ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">No clients match this filter</p>
          </div>
        )}

        {filtered.map(client => {
          const daysAgo = Math.floor((new Date() - new Date(client.last_contact)) / (1000*60*60*24))
          const isExpanded = expanded === client.id

          return (
            <div key={client.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Client Row */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {client.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{client.name}</span>
                    <Badge status={client.status} />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      client.payment_status === 'paid'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {client.payment_status === 'paid' ? '✓ paid' : '⚠ pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{client.project} · {daysAgo}d ago</p>
                </div>

                {/* Invoice */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    ₹{(client.invoice_amount || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-400">invoice</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleExpand(client.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors" title="View">
                    <Eye size={15} />
                  </button>
                  <button onClick={() => setEditClient(client)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors" title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => { setLogClient(client); fetchLogs(client.id) }}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors" title="Add Log">
                    <FileText size={15} />
                  </button>
                  <button onClick={() => { setEmailClient(client); setEmailDraft(''); setEmailReq('') }}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors" title="Draft Email">
                    <Mail size={15} />
                  </button>
                  <button onClick={() => setDeleteId(client.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => toggleExpand(client.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors ml-1">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-gray-50 bg-gray-50 p-5">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Details + Invoice */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
                      <div className="flex flex-col gap-1.5 text-sm text-gray-600 mb-4">
                        <span><span className="text-gray-400">Project:</span> {client.project}</span>
                        <span><span className="text-gray-400">Status:</span> {client.status}</span>
                        <span><span className="text-gray-400">Payment:</span> {client.payment_status}</span>
                        <span><span className="text-gray-400">Last contact:</span> {client.last_contact?.slice(0, 10)}</span>
                      </div>

                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Invoice Amount</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-900"
                          value={invoiceVal[client.id] || 0}
                          onChange={e => setInvoiceVal(v => ({ ...v, [client.id]: parseFloat(e.target.value) }))}
                        />
                        <button
                          onClick={() => handleSaveInvoice(client.id)}
                          className="bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Logs */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Activity Log</p>
                      <div className="flex flex-col gap-2 max-h-36 overflow-y-auto mb-3">
                        {(logs[client.id] || []).length === 0 && (
                          <p className="text-xs text-gray-400">No logs yet</p>
                        )}
                        {(logs[client.id] || []).map((log, i) => (
                          <div key={i} className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <span className="text-gray-400 mr-2">{log.date}</span>
                            {log.note}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modals ── */}

      {/* Add Client */}
      {showAdd && (
        <Modal title="Add New Client" onClose={() => setShowAdd(false)}>
          <ClientForm onSave={handleAdd} onCancel={() => setShowAdd(false)} loading={loading} />
        </Modal>
      )}

      {/* Edit Client */}
      {editClient && (
        <Modal title={`Edit ${editClient.name}`} onClose={() => setEditClient(null)}>
          <ClientForm initial={editClient} onSave={handleEdit} onCancel={() => setEditClient(null)} loading={loading} />
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Delete Client" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-600 mb-5">Are you sure? This will also delete all logs. This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600">
              Yes, Delete
            </button>
            <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Add Log */}
      {logClient && (
        <Modal title={`Log — ${logClient.name}`} onClose={() => setLogClient(null)}>
          <div className="flex flex-col gap-3">
            {/* Existing logs */}
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5">
              {(logs[logClient.id] || []).map((log, i) => (
                <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-400 mr-2">{log.date}</span>{log.note}
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                placeholder="What happened? e.g. Sent revised draft, client approved..."
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
              />
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
              />
              <button
                onClick={handleAddLog}
                disabled={loading || !logNote}
                className="w-full mt-3 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Save Log
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Email Draft */}
      {emailClient && (
        <Modal title={`Draft Email — ${emailClient.name}`} onClose={() => { setEmailClient(null); setEmailDraft('') }}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400">Tell me what you want to say in plain English</p>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="e.g. remind him about the pending payment politely, or tell her the project is complete and ask for feedback"
              value={emailReq}
              onChange={e => setEmailReq(e.target.value)}
            />
            <button
              onClick={handleDraftEmail}
              disabled={loading || !emailReq}
              className="bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : '⚡'}
              Generate Email
            </button>
            {emailDraft && (
              <div className="mt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Generated Email</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(emailDraft)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  rows={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 resize-none focus:outline-none"
                  value={emailDraft}
                  readOnly
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
