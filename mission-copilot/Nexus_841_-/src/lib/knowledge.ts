export type Sev = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncStatus = "RESOLVED" | "ACTIVE" | "MONITORING";

export type Incident = {
  id: string;
  date: string;
  iso: string;
  system: string;
  type: string;
  severity: Sev;
  status: IncStatus;
  similarity: number;
  thermal: boolean;
  summary: string;
  signals: string[];
  resolution: string;
  evidence: string[];
  procedure?: string;
};

export const incidents: Incident[] = [
  {
    id: "ACTIVE-01", date: "04 OCT 2026", iso: "2026-10-04", system: "THERMAL", type: "Thermal anomaly",
    severity: "HIGH", status: "ACTIVE", similarity: 100, thermal: true,
    summary: "Current ORBIT-42 thermal anomaly. Temperature rose from 72.1°C to 89.2°C, exceeding the 60–80°C operating range after cooling fan RPM dropped.",
    signals: ["FAN_SPEED_LOW at 14:31:12 — 4200 → 1800 RPM", "TEMP_THRESHOLD_EXCEEDED at 14:32:04", "THERMAL_WARNING at 14:33:18 — 89.2°C", "Bus voltage 12.1V → 11.8V"],
    resolution: "Under investigation. No root cause confirmed.",
    evidence: ["THM-04A", "LOG-4821", "PWR-BUS-B"], procedure: "CP-04",
  },
  {
    id: "INC-182", date: "12 AUG 2026", iso: "2026-08-12", system: "THERMAL", type: "Thermal anomaly",
    severity: "HIGH", status: "RESOLVED", similarity: 91, thermal: true,
    summary: "Thermal subsystem exceeded operating limit after a cooling fan speed reduction. Pattern of fan RPM decrease preceding temperature rise closely resembles the current anomaly.",
    signals: ["Fan RPM fell below threshold prior to temperature rise", "Temperature exceeded 80°C limit", "Minor bus voltage sag on PWR-BUS-B"],
    resolution: "Cooling subsystem inspected per CP-04. Fan power supply connector reseated via command sequence; fan RPM and temperature returned to nominal within 9 minutes.",
    evidence: ["INC-182 report", "THM-04A archive", "PWR-BUS-B archive"], procedure: "CP-04",
  },
  {
    id: "INC-174", date: "09 AUG 2026", iso: "2026-08-09", system: "COMMUNICATIONS", type: "Downlink packet loss",
    severity: "MEDIUM", status: "RESOLVED", similarity: 12, thermal: false,
    summary: "Intermittent packet loss on S-band downlink during ground station handover.",
    signals: ["Packet loss 4.2% over 3 passes", "Signal-to-noise below nominal"],
    resolution: "Handover timing updated in ground segment schedule.",
    evidence: ["COM-SB-02"], procedure: "CM-02",
  },
  {
    id: "INC-167", date: "28 JUL 2026", iso: "2026-07-28", system: "POWER", type: "Power fluctuation",
    severity: "MEDIUM", status: "RESOLVED", similarity: 63, thermal: false,
    summary: "Transient voltage fluctuation on PWR-BUS-B affecting downstream loads, including the cooling fan.",
    signals: ["Bus voltage oscillation ±0.4V", "Momentary fan RPM variation"],
    resolution: "Load-shedding sequence applied; bus regulator recalibrated per PW-07.",
    evidence: ["PWR-BUS-B archive"], procedure: "PW-07",
  },
  {
    id: "INC-151", date: "02 JUL 2026", iso: "2026-07-02", system: "NAVIGATION", type: "Star tracker dropout",
    severity: "LOW", status: "RESOLVED", similarity: 8, thermal: false,
    summary: "Star tracker lost lock for 41 seconds during sun-proximity pass.",
    signals: ["Attitude solution degraded", "Sun exclusion angle violated"],
    resolution: "Attitude profile adjusted; no further dropouts.",
    evidence: ["NAV-ST-1"], procedure: "NV-03",
  },
  {
    id: "INC-143", date: "11 JUN 2026", iso: "2026-06-11", system: "THERMAL", type: "Cooling subsystem warning",
    severity: "MEDIUM", status: "RESOLVED", similarity: 84, thermal: true,
    summary: "Cooling loop warning raised after gradual fan efficiency decline over two orbits.",
    signals: ["Fan RPM drift of −8%", "Temperature trending toward upper limit (78°C)"],
    resolution: "Backup cooling path verified and fan duty cycle increased per CP-04 step 04.",
    evidence: ["THM-04A archive"], procedure: "CP-04",
  },
  {
    id: "INC-129", date: "19 MAY 2026", iso: "2026-05-19", system: "PROPULSION", type: "Valve response delay",
    severity: "HIGH", status: "RESOLVED", similarity: 5, thermal: false,
    summary: "Thruster valve response exceeded expected actuation time by 120 ms.",
    signals: ["Valve actuation delay", "Tank pressure nominal"],
    resolution: "Valve heater cycle adjusted; actuation returned to nominal.",
    evidence: ["PRP-V3"], procedure: "PR-05",
  },
  {
    id: "INC-117", date: "27 APR 2026", iso: "2026-04-27", system: "THERMAL", type: "Heater cycling fault",
    severity: "LOW", status: "MONITORING", similarity: 37, thermal: true,
    summary: "Battery heater cycling more frequently than expected during eclipse.",
    signals: ["Heater duty cycle +22%", "Battery temperature within limits"],
    resolution: "Monitoring continues; thresholds widened temporarily.",
    evidence: ["THM-BAT-1"], procedure: "CP-04",
  },
  {
    id: "INC-098", date: "14 MAR 2026", iso: "2026-03-14", system: "LIFE SUPPORT", type: "CO₂ scrubber variance",
    severity: "CRITICAL", status: "RESOLVED", similarity: 3, thermal: false,
    summary: "CO₂ scrubber output deviated beyond tolerance during test cycle.",
    signals: ["CO₂ partial pressure rise", "Scrubber fan current low"],
    resolution: "Scrubber bed swapped to secondary per LS-01.",
    evidence: ["LS-SCR-2"], procedure: "LS-01",
  },
];

export type ProcStep = {
  n: number;
  title: string;
  instruction: string;
  purpose: string;
  system: string;
  evidence: string;
  relevant?: string;
};

export type Procedure = {
  id: string;
  title: string;
  system: string;
  version: string;
  status: "OFFICIAL / ACTIVE" | "UNDER REVIEW" | "SUPERSEDED";
  updated: string;
  category: string;
  summary: string;
  steps: ProcStep[];
  incident?: string;
};

export const procedures: Procedure[] = [
  {
    id: "CP-04", title: "COOLING SYSTEM TROUBLESHOOTING", system: "THERMAL", version: "4.2",
    status: "OFFICIAL / ACTIVE", updated: "18 AUG 2026", category: "TROUBLESHOOTING",
    summary: "Approved flight procedure for diagnosing cooling performance degradation in the thermal control subsystem.",
    incident: "INC-182",
    steps: [
      { n: 1, title: "Verify cooling telemetry", instruction: "Confirm THM-04A temperature and fan RPM channels are reporting valid, current data and cross-check against redundant sensor THM-04B.", purpose: "Rule out sensor or telemetry faults before acting on readings.", system: "THERMAL", evidence: "THM-04A: 72.1°C → 89.2°C (range 60–80°C)", relevant: "Temperature exceeded operating range at 14:32:04." },
      { n: 2, title: "Verify fan power supply", instruction: "Read cooling fan supply voltage and current on PWR-BUS-B. Compare against nominal 12.0V ±0.3V.", purpose: "Determine whether reduced fan speed coincides with a supply condition.", system: "POWER / THERMAL", evidence: "Fan RPM dropped from 4200 → 1800 RPM; bus voltage 12.1V → 11.8V", relevant: "FAN_SPEED_LOW logged at 14:31:12, 52 s before temperature threshold exceeded." },
      { n: 3, title: "Inspect fan RPM stability", instruction: "Trend fan RPM over the last 30 minutes. Note oscillations, step changes, or sustained low speed.", purpose: "Characterise the fan behaviour pattern (step vs. gradual degradation).", system: "THERMAL", evidence: "Step change at 14:31; sustained ~1800 RPM since." },
      { n: 4, title: "Check backup cooling availability", instruction: "Confirm secondary cooling loop is armed and capable of carrying load. Do not engage without flight director approval.", purpose: "Ensure a fallback is available if primary cooling cannot be restored.", system: "THERMAL", evidence: "Backup loop status: ARMED (last check 14:00:00)." },
    ],
  },
  {
    id: "PW-07", title: "POWER BUS REGULATION RECOVERY", system: "POWER", version: "2.8", status: "OFFICIAL / ACTIVE", updated: "02 AUG 2026", category: "RECOVERY",
    summary: "Steps to stabilise bus voltage fluctuations and recalibrate regulators.", incident: "INC-167",
    steps: [
      { n: 1, title: "Confirm bus voltage trend", instruction: "Trend PWR-BUS-A/B voltage over last orbit.", purpose: "Identify fluctuation magnitude.", system: "POWER", evidence: "PWR-BUS-B archive" },
      { n: 2, title: "Apply load-shedding sequence", instruction: "Shed non-critical loads in priority order L3 → L2.", purpose: "Reduce bus stress.", system: "POWER", evidence: "Load table LT-2" },
      { n: 3, title: "Recalibrate regulator", instruction: "Execute regulator calibration command REG-CAL-B.", purpose: "Restore nominal regulation.", system: "POWER", evidence: "REG-B telemetry" },
    ],
  },
  {
    id: "CM-02", title: "DOWNLINK QUALITY RESTORATION", system: "COMMUNICATIONS", version: "3.1", status: "OFFICIAL / ACTIVE", updated: "15 AUG 2026", category: "TROUBLESHOOTING",
    summary: "Diagnose and restore downlink signal quality.", incident: "INC-174",
    steps: [
      { n: 1, title: "Check link budget", instruction: "Compare SNR with predicted link budget.", purpose: "Locate degradation source.", system: "COMMUNICATIONS", evidence: "COM-SB-02" },
      { n: 2, title: "Verify ground handover timing", instruction: "Review station schedule overlaps.", purpose: "Exclude ground-side cause.", system: "COMMUNICATIONS", evidence: "GS schedule" },
    ],
  },
  {
    id: "NV-03", title: "STAR TRACKER REACQUISITION", system: "NAVIGATION", version: "1.9", status: "OFFICIAL / ACTIVE", updated: "10 JUL 2026", category: "RECOVERY",
    summary: "Reacquire attitude lock after star tracker dropout.", incident: "INC-151",
    steps: [
      { n: 1, title: "Confirm sun exclusion angle", instruction: "Check sun angle relative to tracker boresight.", purpose: "Identify blinding.", system: "NAVIGATION", evidence: "NAV-ST-1" },
      { n: 2, title: "Command reacquisition", instruction: "Issue ST-REACQ once angle clears.", purpose: "Restore attitude solution.", system: "NAVIGATION", evidence: "ADCS log" },
    ],
  },
  {
    id: "PR-05", title: "THRUSTER VALVE CHECKOUT", system: "PROPULSION", version: "2.0", status: "UNDER REVIEW", updated: "01 SEP 2026", category: "INSPECTION",
    summary: "Verify thruster valve actuation timing.", incident: "INC-129",
    steps: [
      { n: 1, title: "Measure actuation time", instruction: "Pulse valve and record response.", purpose: "Quantify delay.", system: "PROPULSION", evidence: "PRP-V3" },
      { n: 2, title: "Adjust valve heater cycle", instruction: "Raise heater setpoint by 2°C.", purpose: "Reduce viscosity-related delay.", system: "PROPULSION", evidence: "Valve heater telemetry" },
    ],
  },
  {
    id: "LS-01", title: "CO₂ SCRUBBER BED SWAP", system: "LIFE SUPPORT", version: "5.0", status: "OFFICIAL / ACTIVE", updated: "22 MAR 2026", category: "CONTINGENCY",
    summary: "Swap to secondary scrubber bed on primary degradation.", incident: "INC-098",
    steps: [
      { n: 1, title: "Confirm CO₂ trend", instruction: "Verify ppCO₂ rising across two sensors.", purpose: "Exclude sensor fault.", system: "LIFE SUPPORT", evidence: "LS-SCR-2" },
      { n: 2, title: "Swap scrubber bed", instruction: "Command SCR-SWAP-2.", purpose: "Restore CO₂ removal.", system: "LIFE SUPPORT", evidence: "Scrubber telemetry" },
    ],
  },
  {
    id: "CP-03", title: "COOLING LOOP FLOW CHECK", system: "THERMAL", version: "3.4", status: "SUPERSEDED", updated: "04 JAN 2026", category: "INSPECTION",
    summary: "Legacy cooling flow verification. Superseded by CP-04 v4.2.",
    steps: [
      { n: 1, title: "Verify loop flow rate", instruction: "Read loop flow sensor.", purpose: "Confirm circulation.", system: "THERMAL", evidence: "THM-FLOW-1" },
    ],
  },
];
