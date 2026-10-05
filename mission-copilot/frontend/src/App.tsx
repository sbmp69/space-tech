import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Telemetry } from './pages/Telemetry'
import { Copilot } from './pages/Copilot'
import { EvidenceExplorer } from './pages/EvidenceExplorer'
import { IncidentTimeline } from './pages/IncidentTimeline'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="telemetry" element={<Telemetry />} />
        <Route path="copilot" element={<Copilot />} />
        <Route path="evidence" element={<EvidenceExplorer />} />
        <Route path="incident" element={<IncidentTimeline />} />
      </Route>
    </Routes>
  )
}

export default App
