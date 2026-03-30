import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAgentStatus } from '../hooks/useAgentStatus'
import './Layout.css'

const Layout: React.FC = () => {
  const { signOut } = useAuth()
  const { agentReachable, loading: agentLoading } = useAgentStatus()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="layout">
      <nav className="nav">
        <span className="nav-brand">EverythingLLM</span>
        <div className="nav-links">
          <NavLink to="/models">Models</NavLink>
          <NavLink to="/hardware">Hardware</NavLink>
          <NavLink to="/benchmark">Benchmark</NavLink>
          <NavLink to="/speculative">Speculative</NavLink>
        </div>
        {!agentLoading && (
          <span className={`agent-badge ${agentReachable ? 'online' : 'offline'}`}>
            {agentReachable ? 'Agent online' : 'Agent offline'}
          </span>
        )}
        <button className="nav-signout" onClick={handleSignOut}>Sign out</button>
      </nav>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
