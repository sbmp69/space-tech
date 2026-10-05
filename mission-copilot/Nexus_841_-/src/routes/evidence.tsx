import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/evidence')({
  component: EvidenceExplorer,
})

import React, { useEffect, useState } from 'react';
import { Database, Search, Filter } from 'lucide-react';

function EvidenceExplorer() {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/evidence`)
      .then(r => r.json())
      .then(data => {
        if (data.data) setEvidence(data.data);
      })
      .catch(e => console.error("Failed to load evidence", e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-wide">Knowledge Base</h2>
        <p className="text-slate-400 text-sm mt-1">Vectorized mission documentation, logs, and procedures</p>
      </header>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800 flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search vector database..." className="w-full bg-slate-950 border border-slate-800 rounded-md pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-md flex items-center gap-2 hover:bg-slate-700 transition-colors border border-slate-700">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">Loading vectors...</div>
          ) : evidence.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p>No knowledge chunks found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidence.map(item => (
                <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-lg hover:border-cyan-500/50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded">{item.source_id}</span>
                    <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded uppercase">{item.source_type}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4 line-clamp-3 group-hover:line-clamp-none">{item.content}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Subsystem: {item.subsystem}</span>
                    <span>Severity: <span className={item.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}>{item.severity}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
