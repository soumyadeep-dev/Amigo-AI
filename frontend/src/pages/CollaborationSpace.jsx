import { useMemo, useState } from 'react'
import {
  Sparkles,
  Users,
  CalendarDays,
  CheckSquare,
  MessageCircle,
  FileText,
  Megaphone,
  ShieldCheck,
  Plus,
  ChevronRight,
  Clock3,
  Video,
  Link as LinkIcon,
  BrainCircuit
} from 'lucide-react'

const initialChannels = [
  { name: 'Product Sprint', topic: 'Sprint planning + backlog grooming', active: 14, unread: 3, icon: CheckSquare, color: 'from-blue-500 to-indigo-500' },
  { name: 'Design Studio', topic: 'Figma reviews + UX decisions', active: 8, unread: 1, icon: Sparkles, color: 'from-fuchsia-500 to-violet-500' },
  { name: 'Client Delivery', topic: 'Daily delivery updates and blockers', active: 11, unread: 4, icon: Megaphone, color: 'from-emerald-500 to-teal-500' },
  { name: 'Knowledge Base', topic: 'Playbooks, SOPs, snippets', active: 6, unread: 0, icon: FileText, color: 'from-amber-500 to-orange-500' },
]

const upcomingMoments = [
  { label: 'Daily sync standup', time: '09:30 AM', owner: 'Delivery Team' },
  { label: 'Design critique', time: '11:15 AM', owner: 'UX Squad' },
  { label: 'Client milestone review', time: '03:00 PM', owner: 'Customer Success' },
]

const teamMembers = [
  { name: 'Aarav', role: 'Product Lead', status: 'In focus mode', dot: 'bg-emerald-400' },
  { name: 'Mira', role: 'Designer', status: 'Reviewing handoff', dot: 'bg-blue-400' },
  { name: 'Vihaan', role: 'Engineer', status: 'Pair programming', dot: 'bg-purple-400' },
  { name: 'Ira', role: 'Ops', status: 'On incident watch', dot: 'bg-amber-400' },
]

export default function CollaborationSpace() {
  const [channels, setChannels] = useState(initialChannels)

  const totalUnread = useMemo(
    () => channels.reduce((sum, c) => sum + c.unread, 0),
    [channels]
  )

  function markChannelRead(name) {
    setChannels((prev) => prev.map((c) => (c.name === name ? { ...c, unread: 0 } : c)))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-8 md:p-10">
      <section className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-3xl border border-indigo-100/70 bg-white/80 backdrop-blur-xl shadow-xl shadow-indigo-100/50 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 via-indigo-900 to-slate-900 px-8 py-8 md:px-10 md:py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-indigo-200">
                  <Users size={14} /> Team Collaboration Space
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  The all-in-one mission room for your team.
                </h1>
                <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">
                  Conversations, documents, tasks, rituals, and accountability in one beautiful place. 
                  Keep everyone aligned, move faster, and celebrate progress together.
                </p>
              </div>

              <div className="w-full sm:w-auto grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 min-w-[150px]">
                  <p className="text-xs uppercase tracking-wider text-indigo-100/80">Live members</p>
                  <p className="text-2xl font-bold text-white">39</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 min-w-[150px]">
                  <p className="text-xs uppercase tracking-wider text-indigo-100/80">Unread updates</p>
                  <p className="text-2xl font-bold text-white">{totalUnread}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 p-4 md:p-6 bg-white/70">
            <QuickAction icon={Video} title="Start huddle" subtitle="Jump into an instant call" />
            <QuickAction icon={LinkIcon} title="Share update" subtitle="Post progress for your squad" />
            <QuickAction icon={BrainCircuit} title="AI recap" subtitle="Summarize what changed today" />
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle size={16} className="text-indigo-600" /> Active Collaboration Channels
                </h2>
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  <Plus size={14} /> New Channel
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {channels.map((channel) => {
                  const Icon = channel.icon
                  return (
                    <button
                      key={channel.name}
                      onClick={() => markChannelRead(channel.name)}
                      className="text-left rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${channel.color} text-white flex items-center justify-center shadow-sm`}>
                          <Icon size={16} />
                        </div>
                        {channel.unread > 0 && (
                          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                            {channel.unread} new
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-gray-900">{channel.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{channel.topic}</p>
                      <p className="text-[11px] text-gray-400 mt-3">{channel.active} members active now</p>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays size={16} className="text-indigo-600" /> Team Rhythm Today
              </h2>
              <div className="space-y-3">
                {upcomingMoments.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.owner}</p>
                    </div>
                    <p className="text-xs font-semibold tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                      {item.time}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Presence Board
              </h2>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.name} className="rounded-xl border border-gray-100 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${member.dot}`} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{member.status}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
              <p className="text-xs uppercase tracking-wider text-indigo-700 font-semibold mb-2">Focus lane</p>
              <h3 className="text-sm font-semibold text-gray-900">Top priority</h3>
              <p className="text-sm text-gray-600 mt-1">Finalize onboarding v2 and publish handoff notes by end of day.</p>
              <button className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                Open task board <ChevronRight size={14} />
              </button>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock3 size={15} className="text-indigo-600" /> Auto-generated Standup
              </h3>
              <ul className="space-y-2 text-xs text-gray-600 list-disc pl-5">
                <li>7 tasks completed across Product, Engineering and Design.</li>
                <li>2 blockers need leadership input before 12:00 PM.</li>
                <li>Client delivery stream is 94% on schedule this week.</li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}

function QuickAction({ icon: Icon, title, subtitle }) {
  return (
    <button className="rounded-2xl border border-gray-100 bg-white text-left px-4 py-3 hover:border-indigo-200 hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2">
        <Icon size={15} />
      </div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </button>
  )
}
