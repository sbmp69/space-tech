import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/copilot')({
  component: Copilot,
})

import React, { useState, useEffect } from 'react'
import { Send, Bot, User, CheckCircle2, ChevronRight, Zap, Loader2 } from 'lucide-react'

type Evidence = {
  source_id: string
  source_type: string
  content: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  parsed?: {
    observed_facts: string[]
    analysis: string
    recommendations: string[]
  }
  evidence?: Evidence[]
}

function Copilot() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('copilot_messages')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(false)
  const [activeEvidence, setActiveEvidence] = useState<Evidence[]>(() => {
    const saved = sessionStorage.getItem('copilot_evidence')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    sessionStorage.setItem('copilot_messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    sessionStorage.setItem('copilot_evidence', JSON.stringify(activeEvidence))
  }, [activeEvidence])

  const handleSend = async () => {
    if (!query.trim()) return
    const userMsg = query
    setQuery('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, mission_id: 'ST10-DEMO-001' })
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || 'Backend error')
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        parsed: data.response,
        evidence: data.evidence 
      }])
      if (data.evidence) setActiveEvidence(data.evidence)
    } catch (e: any) {
      console.error(e)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message || 'Connection failed'}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header>
        <h2 className="text-2xl font-bold text-white tracking-wide">Mission Copilot</h2>
        <p className="text-slate-400 text-sm mt-1">Evidence-grounded decision support</p>
      </header>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-500 flex-col">
                <Bot className="w-12 h-12 mb-4 opacity-50" />
                <p>Ask about mission telemetry, anomalies, or procedures...</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-cyan-900/50 border-cyan-800/50'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-cyan-400" />}
                </div>
                
                <div className="flex-1 pt-1 space-y-4">
                  {msg.role === 'user' ? (
                    <p className="text-slate-200">{msg.content}</p>
                  ) : (
                    msg.parsed ? (
                      <>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <h4 className="text-xs uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Observed Facts
                          </h4>
                          <ul className="text-sm text-slate-300 space-y-1 ml-6 list-disc marker:text-slate-600">
                            {(msg.parsed.observed_facts || []).map((fact, idx) => <li key={idx}>{fact}</li>)}
                          </ul>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <h4 className="text-xs uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-2">
                            <ChevronRight className="w-4 h-4" /> Analysis
                          </h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{msg.parsed.analysis || "No analysis provided."}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                          <h4 className="text-xs uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Recommendations
                          </h4>
                          <ul className="text-sm text-slate-300 space-y-1 ml-6 list-disc marker:text-slate-600">
                            {(msg.parsed.recommendations || []).map((rec, idx) => <li key={idx}>{rec}</li>)}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <p className="text-red-400 text-sm">{msg.content}</p>
                    )
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center shrink-0 border border-cyan-800/50">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 pt-2">
                  <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                </div>
              </div>
            )}
            
          </div>
          
          <div className="p-4 border-t border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={query}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query mission data..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder:text-slate-600"
              />
              <button onClick={handleSend} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white p-2 rounded-md transition-colors">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-4 hidden xl:flex flex-col h-full overflow-hidden">
          <h3 className="text-sm font-medium text-slate-200 mb-4 uppercase tracking-widest shrink-0">Retrieved Evidence</h3>
          <div className="space-y-3 overflow-y-auto pr-2 pb-4">
            {activeEvidence.length === 0 ? (
              <p className="text-sm text-slate-500">Ask a question to see semantic vector retrieval results here.</p>
            ) : (
              activeEvidence.map((ev, i) => (
                <div key={i} className="p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-pointer hover:border-slate-600 transition-colors group relative">
                  <div className="text-xs font-mono text-cyan-400 mb-1 flex justify-between">
                    <span>{ev.source_id}</span>
                    <span className="text-slate-500">{ev.source_type}</span>
                  </div>
                  <div className="text-sm text-slate-300 line-clamp-3 group-hover:line-clamp-none transition-all">{ev.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
