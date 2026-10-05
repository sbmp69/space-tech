import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Rocket, Activity, MessageSquare, Database, Clock } from 'lucide-react'

export function Sidebar() {
  const location = useLocation()

  const links = [
    { to: '/', label: 'Dashboard', icon: <Rocket className="w-5 h-5" /> },
    { to: '/telemetry', label: 'Telemetry', icon: <Activity className="w-5 h-5" /> },
    { to: '/copilot', label: 'Copilot AI', icon: <MessageSquare className="w-5 h-5" /> },
    { to: '/evidence', label: 'Evidence', icon: <Database className="w-5 h-5" /> },
    { to: '/incident', label: 'Timeline', icon: <Clock className="w-5 h-5" /> },
  ]

  return (
    <div className="w-64 h-full bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
          <Rocket className="w-6 h-6 text-amber-500" />
          ST-10 MCC
        </h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const active = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                active 
                  ? 'bg-slate-800 text-cyan-400 shadow-[inset_2px_0_0_0_#22d3ee]' 
                  : 'hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              {link.icon}
              <span className="font-medium tracking-wide">{link.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 uppercase tracking-wider text-center">
        Sys: Nominal
      </div>
    </div>
  )
}
