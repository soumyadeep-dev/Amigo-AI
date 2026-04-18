import { useMemo, useState } from 'react'
import {
  Users,
  MessageCircle,
  CalendarDays,
  CheckCircle2,
  Plus,
  Bell,
  Sparkles,
  Send,
  Clock3,
  Link as LinkIcon
} from 'lucide-react'

const channels = [
  { id: 'general', name: '# general' },
  { id: 'product', name: '# product-launch' },
  { id: 'design', name: '# design-reviews' },
  { id: 'support', name: '# support' }
]

const initialMessages = {
  general: [
    { id: 1, user: 'Aarav', time: '09:12', text: 'Daily standup in 18 minutes. Please drop blockers before we start.' },
    { id: 2, user: 'Maya', time: '09:15', text: 'Shared the latest dashboard screenshots in #design-reviews for feedback.' }
  ],
  'product-launch': [
    { id: 3, user: 'Nora', time: '08:54', text: 'Launch landing page copy is ready. Need final approval from growth + design.' },
    { id: 4, user: 'Rohan', time: '09:04', text: 'I can handle analytics events today. Please tag the button IDs in Figma.' }
  ],
  'design-reviews': [
    { id: 5, user: 'Maya', time: '08:42', text: 'Updated onboarding card spacing and hover states. Looking for quick UX review.' }
  ],
  support: [
    { id: 6, user: 'Nina', time: '09:01', text: 'Two clients requested export filters in reports. Logged in backlog as high intent.' }
  ]
}

const initialTasks = [
  { id: 1, title: 'Finalize launch checklist', owner: 'Aarav', due: 'Today', status: 'In Progress' },
  { id: 2, title: 'Review payment reminder copy', owner: 'Maya', due: 'Tomorrow', status: 'Review' },
  { id: 3, title: 'Prepare support FAQ update', owner: 'Nina', due: 'Apr 21', status: 'Todo' }
]

const upcoming = [
  { id: 1, title: 'Sprint planning', when: 'Today · 2:00 PM', room: 'Huddle Room A' },
  { id: 2, title: 'Launch go/no-go', when: 'Monday · 11:00 AM', room: 'Zoom Link' },
  { id: 3, title: 'Design critique', when: 'Tuesday · 4:30 PM', room: 'Figma Live' }
]

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700'
  }

  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${tones[tone]}`}>{children}</span>
}

export default function TeamSpace() {
  const [activeChannel, setActiveChannel] = useState('general')
  const [messages, setMessages] = useState(initialMessages)
  const [tasks, setTasks] = useState(initialTasks)
  const [draft, setDraft] = useState('')

  const activeMessages = useMemo(() => messages[activeChannel] || [], [messages, activeChannel])

  function sendMessage() {
    if (!draft.trim()) return

    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')

    const nextMessage = {
      id: Date.now(),
      user: 'You',
      time: `${hh}:${mm}`,
      text: draft.trim()
    }

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), nextMessage]
    }))

    setDraft('')
  }

  function addQuickTask() {
    const title = window.prompt('Add a quick team task:')
    if (!title?.trim()) return

    setTasks(prev => [
      { id: Date.now(), title: title.trim(), owner: 'You', due: 'This week', status: 'Todo' },
      ...prev
    ])
  }

  const stats = [
    { label: 'Members Online', value: '12', icon: Users, tone: 'blue' },
    { label: 'Open Threads', value: '8', icon: MessageCircle, tone: 'amber' },
    { label: 'Tasks in Motion', value: String(tasks.length), icon: CheckCircle2, tone: 'green' },
    { label: 'Today Events', value: '3', icon: CalendarDays, tone: 'slate' }
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Team Collaboration Hub</p>
            <h1 className="text-2xl font-bold mt-1">Welcome to your Team Space ✨</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              A focused place for updates, async chats, quick actions, and meeting visibility so everyone stays aligned.
            </p>
          </div>
          <button
            onClick={addQuickTask}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <Plus size={14} /> Quick Add Task
          </button>
        </div>
      </div>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Icon size={15} className="text-slate-600" />
              </div>
            </div>
            <div className="flex items-end justify-between mt-3">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <Pill tone={tone}>Live</Pill>
            </div>
          </div>
        ))}
      </section>

      <section className="grid xl:grid-cols-[1.2fr_2fr_1.2fr] gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Channels</p>
            <Sparkles size={14} className="text-slate-400" />
          </div>

          <div className="space-y-2">
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeChannel === channel.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {channel.name}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Announcements</p>
            <p className="text-sm text-blue-900">Client demo prep at 5:30 PM. Please update your sections by 4:45 PM.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[490px]">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Conversation</p>
              <h2 className="font-semibold text-slate-900">{channels.find(c => c.id === activeChannel)?.name}</h2>
            </div>
            <Pill tone="green">Active now</Pill>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-slate-50/60">
            {activeMessages.map(msg => (
              <div key={msg.id} className="bg-white border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{msg.user}</p>
                  <p className="text-xs text-slate-400">{msg.time}</p>
                </div>
                <p className="text-sm text-slate-700 mt-1">{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Share update, ask for feedback, or post blocker..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                onClick={sendMessage}
                className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-700 inline-flex items-center gap-2"
              >
                <Send size={14} /> Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">Team Tasks</p>
              <button onClick={addQuickTask} className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                  <p className="text-sm font-medium text-slate-900">{task.title}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>{task.owner}</span>
                    <span>{task.due}</span>
                  </div>
                  <div className="mt-2">
                    <Pill tone={task.status === 'In Progress' ? 'blue' : task.status === 'Review' ? 'amber' : 'slate'}>{task.status}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900 mb-3">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map(item => (
                <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1"><Clock3 size={12} /> {item.when}</p>
                  <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1"><LinkIcon size={12} /> {item.room}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wider font-semibold text-amber-700 inline-flex items-center gap-1"><Bell size={12} /> Focus Note</p>
            <p className="text-sm text-amber-900 mt-2">Keep updates actionable: what changed, what you need, and when you need it.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
