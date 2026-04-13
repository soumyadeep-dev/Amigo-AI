import { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getClients, getRevenue, getMonthlyRevenue, getBriefing } from '../api'
import { TrendingUp, Users, AlertCircle, CheckCircle, Clock, IndianRupee, RefreshCw, Loader2 } from 'lucide-react'

const STATUS_COLORS = {
  'in progress': '#3b82f6',
  'stalled':     '#f59e0b',
  'completed':   '#22c55e',
}

function MetricCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = {
    blue:   'border-blue-500   bg-blue-50   text-blue-600',
    green:  'border-green-500  bg-green-50  text-green-600',
    amber:  'border-amber-500  bg-amber-50  text-amber-600',
    red:    'border-red-500    bg-red-50    text-red-600',
    gray:   'border-gray-400   bg-gray-50   text-gray-600',
  }
  const [border, bg, text] = colors[color].split(' ')

  return (
    <div className={`bg-white rounded-xl border-l-4 ${border} p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon size={16} className={text} />
        </div>
      </div>
    </div>
  )
}

function BriefingRenderer({ text }) {
  if (!text) return null

  const priorityConfig = {
    'high':   { color: 'bg-red-50 border-red-200',    dot: 'bg-red-500',   label: 'High Priority',   labelColor: 'text-red-600'   },
    'medium': { color: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', label: 'Medium Priority', labelColor: 'text-amber-600' },
    'low':    { color: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-400',  label: 'Low Priority',    labelColor: 'text-blue-600'  },
  }

  const lines    = text.split('\n').filter(l => l.trim())
  const sections = []
  let current    = null

  for (const line of lines) {
    const clean = line.replace(/\*\*/g, '').trim()

    if (/high priority/i.test(clean)) {
      current = { type: 'high', items: [] }
      sections.push(current)
    } else if (/medium priority/i.test(clean)) {
      current = { type: 'medium', items: [] }
      sections.push(current)
    } else if (/low priority/i.test(clean)) {
      current = { type: 'low', items: [] }
      sections.push(current)
    } else if (current && /^\d+\./.test(line.trim())) {
      const itemText = clean.replace(/^\d+\.\s*/, '')
      const colonIdx = itemText.indexOf(':')
      if (colonIdx > -1) {
        current.items.push({
          title: itemText.slice(0, colonIdx).trim(),
          desc:  itemText.slice(colonIdx + 1).trim()
        })
      } else {
        current.items.push({ title: '', desc: itemText })
      }
    } else if (!current && clean && !/priority briefing/i.test(clean)) {
      sections.push({ type: 'intro', text: clean })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section, i) => {
        if (section.type === 'intro') {
          return (
            <p key={i} className="text-sm text-gray-500 leading-relaxed">
              {section.text}
            </p>
          )
        }

        const cfg = priorityConfig[section.type]
        return (
          <div key={i} className={`rounded-xl border p-4 ${cfg.color}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.labelColor}`}>
                {cfg.label}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-start gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {item.title && (
                      <span className="font-semibold text-gray-900">{item.title}: </span>
                    )}
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [clients,        setClients]        = useState([])
  const [revenue,        setRevenue]        = useState({ earned: 0, pending: 0, total: 0 })
  const [monthly,        setMonthly]        = useState([])
  const [briefing,       setBriefing]       = useState('')
  const [loadingBriefing, setLoadingBriefing] = useState(false)

  useEffect(() => {
    fetchAll()
    fetchBriefing()
  }, [])

  async function fetchAll() {
    const [c, r, m] = await Promise.all([
      getClients(),
      getRevenue(),
      getMonthlyRevenue(),
    ])
    setClients(c.data)
    setRevenue(r.data)
    setMonthly(m.data.map(d => ({ ...d, month: d.month?.slice(0, 7) })))
  }

  async function fetchBriefing() {
    setLoadingBriefing(true)
    const res = await getBriefing()
    setBriefing(res.data.briefing)
    setLoadingBriefing(false)
  }

  const total      = clients.length
  const inProgress = clients.filter(c => c.status === 'in progress').length
  const stalled    = clients.filter(c => c.status === 'stalled').length
  const completed  = clients.filter(c => c.status === 'completed').length
  const pendingPay = clients.filter(c => c.payment_status === 'pending').length

  const now = new Date()
  const overdue = clients.filter(c => {
    const diff = (now - new Date(c.last_contact)) / (1000 * 60 * 60 * 24)
    return diff > 7
  }).length

  const statusData = [
    { name: 'In Progress', value: inProgress, color: '#3b82f6' },
    { name: 'Stalled',     value: stalled,    color: '#f59e0b' },
    { name: 'Completed',   value: completed,  color: '#22c55e' },
  ].filter(d => d.value > 0)

  const contactData = clients
    .map(c => ({
      name: c.name,
      days: Math.floor((now - new Date(c.last_contact)) / (1000 * 60 * 60 * 24))
    }))
    .sort((a, b) => b.days - a.days)

  return (
    <div className="p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Good morning 👋</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Client Metrics */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard label="Total Clients"   value={total}      icon={Users}       color="blue"  />
        <MetricCard label="In Progress"     value={inProgress} icon={Clock}       color="blue"  />
        <MetricCard label="Stalled"         value={stalled}    icon={AlertCircle} color="amber" />
        <MetricCard label="Completed"       value={completed}  icon={CheckCircle} color="green" />
        <MetricCard label="Pending Payment" value={pendingPay} icon={IndianRupee} color="red"   />
        <MetricCard label="Overdue Follow"  value={overdue}    icon={AlertCircle} color="red"   />
      </div>

      {/* Revenue */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <MetricCard label="Total Earned"       value={`₹${revenue.earned.toLocaleString('en-IN')}`}  icon={TrendingUp}  color="green" />
          <MetricCard label="Pending Collection" value={`₹${revenue.pending.toLocaleString('en-IN')}`} icon={IndianRupee} color="red"   />
          <MetricCard label="Total Invoiced"     value={`₹${revenue.total.toLocaleString('en-IN')}`}   icon={IndianRupee} color="gray"  />
        </div>

        {monthly.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-medium text-gray-600 mb-4">Monthly Earned Revenue</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} barSize={32}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Earned']} />
                <Bar dataKey="earned" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Donut */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">Project Status</p>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {statusData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="font-semibold text-gray-900 ml-auto pl-4">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>

        {/* Days since contact */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">Days Since Last Contact</p>
          {contactData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={contactData} layout="vertical" barSize={16}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => [`${v} days`, 'Last Contact']} />
                <Bar dataKey="days" radius={[0, 6, 6, 0]}>
                  {contactData.map((entry, i) => (
                    <Cell key={i} fill={entry.days > 10 ? '#ef4444' : entry.days > 5 ? '#f59e0b' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No data yet</p>
          )}
        </div>
      </div>

      {/* AI Briefing */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-semibold text-gray-800">AI Daily Briefing</p>
          </div>
          <button
            onClick={fetchBriefing}
            disabled={loadingBriefing}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <RefreshCw size={12} className={loadingBriefing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loadingBriefing ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm p-6">
            <Loader2 size={14} className="animate-spin" />
            Analyzing your clients...
          </div>
        ) : (
          <div className="p-6">
            <BriefingRenderer text={briefing} />
          </div>
        )}
      </div>

    </div>
  )
}
