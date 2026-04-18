import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Chat from './pages/Chat'
import Kanban from './pages/Kanban'
import TeamSpace from './pages/TeamSpace'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#f5f5f0] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"         element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients"   element={<Clients />} />
            <Route path="/kanban"    element={<Kanban />} />
            <Route path="/team-space" element={<TeamSpace />} />
            <Route path="/chat"      element={<Chat />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
