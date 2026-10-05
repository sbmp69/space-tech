import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export function IncidentTimeline() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/timeline`)
      .then(r => r.json())
      .then(data => {
        if (data.events) setEvents(data.events);
      })
      .catch(e => console.error("Failed to load timeline", e))
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-cyan-500" />;
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col max-w-4xl mx-auto w-full">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-wide">Incident Timeline</h2>
        <p className="text-slate-400 text-sm mt-1">Chronological record of mission events and anomalies</p>
      </header>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-8 overflow-y-auto">
        {loading ? (
          <div className="text-slate-500 text-center mt-10">Loading timeline...</div>
        ) : (
          <div className="relative border-l border-slate-700 ml-4 space-y-8">
            {events.map((evt, i) => (
              <div key={i} className="relative pl-8">
                <div className="absolute -left-[11px] top-1 bg-slate-900 rounded-full p-0.5">
                  {getIcon(evt.type)}
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-semibold ${evt.type === 'critical' ? 'text-red-400' : evt.type === 'warning' ? 'text-amber-400' : 'text-slate-200'}`}>
                      {evt.title}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {evt.time}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {evt.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
