import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  Plus,
  Clock3,
  Send,
  Trash2,
} from 'lucide-react'
import {
  getTeamMembers,
  createTeamMember,
  deleteTeamMember,
  getTeamChannels,
  createTeamChannel,
  getChannelUpdates,
  createChannelUpdate,
} from '../api'

const upcomingMoments = [
  { label: 'Daily sync standup', time: '09:30 AM', owner: 'Delivery Team' },
  { label: 'Design critique', time: '11:15 AM', owner: 'UX Squad' },
  { label: 'Client milestone review', time: '03:00 PM', owner: 'Customer Success' },
]

export default function CollaborationSpace() {
  const [teamMembers, setTeamMembers] = useState([])
  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  const [newMember, setNewMember] = useState({ name: '', role: '', email: '', status: 'online' })
  const [newChannel, setNewChannel] = useState({ name: '', topic: '' })
  const [newUpdate, setNewUpdate] = useState('')
  const [posting, setPosting] = useState(false)

  const totalUpdates = useMemo(
    () => channels.reduce((sum, c) => sum + (c.updates || 0), 0),
    [channels]
  )

  async function loadBaseData() {
    setLoading(true)
    try {
      const [membersRes, channelsRes] = await Promise.all([
        getTeamMembers(),
        getTeamChannels(),
      ])
      setTeamMembers(membersRes.data)
      setChannels(channelsRes.data)
      if (!selectedChannelId && channelsRes.data.length > 0) {
        setSelectedChannelId(channelsRes.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load collaboration data', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadChannelUpdates(channelId) {
    if (!channelId) return
    try {
      const res = await getChannelUpdates(channelId)
      setUpdates(res.data)
    } catch (error) {
      console.error('Failed to load channel updates', error)
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  useEffect(() => {
    loadChannelUpdates(selectedChannelId)
  }, [selectedChannelId])

  async function handleAddMember(e) {
    e.preventDefault()
    if (!newMember.name.trim() || !newMember.role.trim()) return
    try {
      await createTeamMember({
        ...newMember,
        email: newMember.email.trim() || null,
      })
      setNewMember({ name: '', role: '', email: '', status: 'online' })
      await loadBaseData()
    } catch (error) {
      console.error('Failed to create team member', error)
    }
  }

  async function handleDeleteMember(memberId) {
    try {
      await deleteTeamMember(memberId)
      await loadBaseData()
    } catch (error) {
      console.error('Failed to delete member', error)
    }
  }

  async function handleAddChannel(e) {
    e.preventDefault()
    if (!newChannel.name.trim()) return
    try {
      await createTeamChannel(newChannel)
      setNewChannel({ name: '', topic: '' })
      await loadBaseData()
    } catch (error) {
      console.error('Failed to create channel', error)
    }
  }

  async function handlePostUpdate(e) {
    e.preventDefault()
    if (!selectedChannelId || !newUpdate.trim()) return
    setPosting(true)
    try {
      const memberId = teamMembers[0]?.id || null
      await createChannelUpdate(selectedChannelId, {
        message: newUpdate.trim(),
        member_id: memberId,
      })
      setNewUpdate('')
      await Promise.all([loadBaseData(), loadChannelUpdates(selectedChannelId)])
    } catch (error) {
      console.error('Failed to post update', error)
    } finally {
      setPosting(false)
    }
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
                  Backend-powered mission room for your team.
                </h1>
                <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">
                  Live members, real channels, and persistent updates are now saved in your backend.
                </p>
              </div>

              <div className="w-full sm:w-auto grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 min-w-[150px]">
                  <p className="text-xs uppercase tracking-wider text-indigo-100/80">Live members</p>
                  <p className="text-2xl font-bold text-white">{teamMembers.length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 min-w-[150px]">
                  <p className="text-xs uppercase tracking-wider text-indigo-100/80">Total updates</p>
                  <p className="text-2xl font-bold text-white">{totalUpdates}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle size={16} className="text-indigo-600" /> Active Collaboration Channels
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`text-left rounded-xl border transition-all bg-white p-4 ${
                      selectedChannelId === channel.id
                        ? 'border-indigo-300 shadow-md'
                        : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{channel.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{channel.topic || 'No topic set'}</p>
                    <p className="text-[11px] text-gray-400 mt-3">{channel.updates || 0} updates</p>
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddChannel} className="grid md:grid-cols-3 gap-2">
                <input
                  value={newChannel.name}
                  onChange={(e) => setNewChannel((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="New channel name"
                />
                <input
                  value={newChannel.topic}
                  onChange={(e) => setNewChannel((prev) => ({ ...prev, topic: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Topic"
                />
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                  <Plus size={14} /> Add Channel
                </button>
              </form>
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

            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 md:p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Send size={15} className="text-indigo-600" /> Channel Updates
              </h3>
              {selectedChannelId ? (
                <>
                  <form onSubmit={handlePostUpdate} className="flex gap-2 mb-3">
                    <input
                      value={newUpdate}
                      onChange={(e) => setNewUpdate(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Post update to selected channel"
                    />
                    <button
                      disabled={posting}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      {posting ? 'Posting...' : 'Post'}
                    </button>
                  </form>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {updates.length === 0 && (
                      <p className="text-xs text-gray-500">No updates yet for this channel.</p>
                    )}
                    {updates.map((update) => (
                      <div key={update.id} className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="text-sm text-gray-800">{update.message}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          by {update.member_name} • {new Date(update.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500">Create or select a channel to begin collaboration.</p>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Team Members
              </h2>
              <div className="space-y-3 mb-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="rounded-xl border border-gray-100 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-gray-400 hover:text-rose-500"
                        title="Delete member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{member.status}{member.email ? ` • ${member.email}` : ''}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddMember} className="space-y-2">
                <input
                  value={newMember.name}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Member name"
                />
                <input
                  value={newMember.role}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Role"
                />
                <input
                  value={newMember.email}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Email (optional)"
                />
                <select
                  value={newMember.status}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="online">online</option>
                  <option value="focus">focus</option>
                  <option value="offline">offline</option>
                </select>
                <button className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                  <Plus size={14} /> Add Member
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock3 size={15} className="text-indigo-600" /> Status
              </h3>
              {loading ? (
                <p className="text-xs text-gray-500">Loading collaboration workspace...</p>
              ) : (
                <ul className="space-y-2 text-xs text-gray-600 list-disc pl-5">
                  <li>{channels.length} active channels connected to backend.</li>
                  <li>{teamMembers.length} members available in collaboration roster.</li>
                  <li>{totalUpdates} persisted updates across channels.</li>
                </ul>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
