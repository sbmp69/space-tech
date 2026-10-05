import React, { useEffect, useState } from 'react'
import { Activity, AlertTriangle, ShieldCheck, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Dashboard() {
  const [telemetry, setTelemetry] = useState<any[]>([])
  const [latestData, setLatestData] = useState({
    core_temp: 84.2,
    voltage: 32.0,
    life_support: 98.0,
    is_anomaly: false
  })
  
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/ws/telemetry')
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'telemetry') {
          const { data, timestamp } = message
          
          setLatestData(data)
          
          setTelemetry(prev => {
            const newData = [...prev, { time: timestamp, ...data }]
            if (newData.length > 20) newData.shift() // Keep last 20 points
            return newData
          })
          
          if (data.is_anomaly) {
            setAlerts(prev => {
              if (prev.length > 0 && prev[0].time === timestamp) return prev
              const newAlerts = [{ time: timestamp, msg: "CRITICAL: Solar voltage dropped below nominal thresholds!" }, ...prev]
              return newAlerts.slice(0, 5)
            })
          }
        }
      }

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimeout)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [])

  const metrics = [
    { label: 'Core Temp', value: `${latestData.core_temp}°C`, status: 'normal', icon: <Zap className="w-5 h-5 text-amber-500" /> },
    { label: 'Solar Voltage', value: `${latestData.voltage}V`, status: latestData.voltage < 20 ? 'critical' : 'normal', icon: <Zap className="w-5 h-5 text-cyan-400" /> },
    { label: 'Life Support', value: `${latestData.life_support}%`, status: 'warning', icon: <ShieldCheck className="w-5 h-5 text-emerald-400" /> },
    { label: 'Anomalies', value: alerts.length.toString(), status: 'critical', icon: <AlertTriangle className={`w-5 h-5 ${latestData.is_anomaly ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} /> },
  ]

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Mission Overview</h2>
          <p className="text-slate-400 text-sm mt-1">Status of critical mission parameters</p>
        </div>
        {latestData.is_anomaly && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded font-mono animate-pulse flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ANOMALY DETECTED
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className={`bg-slate-900 border ${m.status === 'critical' ? 'border-red-500' : 'border-slate-800'} rounded-lg p-5 flex flex-col justify-between`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">{m.label}</span>
              {m.icon}
            </div>
            <div className={`text-3xl font-mono ${m.status === 'critical' ? 'text-red-400' : 'text-slate-100'}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-96">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
          <h3 className="text-lg font-medium text-slate-200 mb-4 uppercase tracking-widest text-sm">Solar Voltage Telemetry</h3>
          <div className="flex-1 w-full h-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                <Line type="monotone" dataKey="voltage" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col">
          <h3 className="text-lg font-medium text-slate-200 mb-4 uppercase tracking-widest text-sm">Recent Alerts</h3>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            {alerts.length === 0 ? (
              <div className="text-slate-500 text-sm h-full flex items-center justify-center">No alerts active.</div>
            ) : (
              alerts.map((a, idx) => (
                <div key={idx} className="p-3 border-l-2 border-red-500 bg-red-950/30 rounded-r text-sm">
                  <div className="font-mono text-red-400 mb-1">{a.time} UTC</div>
                  <div className="text-slate-300">{a.msg}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
