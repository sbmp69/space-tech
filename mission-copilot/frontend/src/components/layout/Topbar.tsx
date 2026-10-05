import React from 'react'

export function Topbar() {
  return (
    <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <div className="bg-red-500/20 text-red-400 px-3 py-1 rounded-sm border border-red-500/50 text-xs font-mono font-bold tracking-wider">
          LIVE
        </div>
        <div className="text-sm font-mono text-slate-400">
          T+ 00:14:32:05
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-emerald-400">Telemetry Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-cyan-400">AI Copilot Linked</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
          <span className="text-xs font-bold text-slate-300">OP</span>
        </div>
      </div>
    </div>
  )
}
