import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, MessageSquare, Brain } from 'lucide-react'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients',   icon: Users,           label: 'Clients'   },
  { to: '/chat',      icon: MessageSquare,   label: 'Chat'      },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-4 shrink-0 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
          <Brain size={16} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm tracking-tight">Amigo AI</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-2">
        <div className="text-[11px] text-gray-400 leading-relaxed">
          Powered by<br />
          <span className="font-medium text-gray-500">Llama 3.2 · Local AI</span>
        </div>
      </div>
    </aside>
  )
}
