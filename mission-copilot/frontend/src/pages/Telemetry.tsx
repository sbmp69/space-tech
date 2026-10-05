import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity } from 'lucide-react';

export function Telemetry() {
  const [telemetry, setTelemetry] = useState<any[]>([]);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws/telemetry');
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'telemetry') {
          const { data, timestamp } = message;
          
          setTelemetry(prev => {
            const newData = [...prev, { time: timestamp, ...data }];
            if (newData.length > 50) newData.shift(); // Keep last 50 points
            return newData;
          });
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-cyan-400" />
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Telemetry Streams</h2>
          <p className="text-slate-400 text-sm mt-1">Deep-dive realtime charts for subsystem monitoring</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Chart 1: Core Temp */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-medium text-amber-500 mb-4 uppercase tracking-widest flex items-center justify-between">
            <span>Reactor Core Temperature (C)</span>
            <span className="text-xs text-slate-500 font-mono">NOMINAL</span>
          </h3>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 10}} minTickGap={30} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="core_temp" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemp)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Life Support */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-medium text-emerald-500 mb-4 uppercase tracking-widest flex items-center justify-between">
            <span>Life Support System (%)</span>
            <span className="text-xs text-slate-500 font-mono">OPTIMAL</span>
          </h3>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry}>
                <defs>
                  <linearGradient id="colorLife" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 10}} minTickGap={30} />
                <YAxis domain={[95, 100]} stroke="#64748b" tick={{fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="life_support" stroke="#10b981" fillOpacity={1} fill="url(#colorLife)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Voltage (Span 2 cols on desktop) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col h-64">
          <h3 className="text-sm font-medium text-cyan-500 mb-4 uppercase tracking-widest flex items-center justify-between">
            <span>Solar Array Voltage (V)</span>
            <span className="text-xs text-slate-500 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> LIVE
            </span>
          </h3>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 10}} minTickGap={50} />
                <YAxis domain={[0, 40]} stroke="#64748b" tick={{fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                <Line type="stepAfter" dataKey="voltage" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
