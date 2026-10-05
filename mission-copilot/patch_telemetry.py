import re
with open(r'Nexus_841_-\src\routes\telemetry.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all occurrences of data. with liveData.
content = re.sub(r'\bdata\b', 'liveData', content)

# But wait, there are Recharts attributes like dataKey, data={...}.
# We only want to replace the variable data.
content = content.replace("liveDataKey", "dataKey")
content = content.replace("liveData=", "data=")

# Now insert the state and useEffect at the beginning of TelemetryPage
insert_hook = """function TelemetryPage() {
  const [liveData, setLiveData] = useState(missionSnapshot.telemetry);

  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/telemetry`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setLiveData(prev => {
        const newData = [...prev, {
          time: `14:32:${String(msg.tick).padStart(2, '0')}`,
          temperature: msg.core_temp,
          fanRpm: msg.life_support * 40,
          voltage: msg.voltage
        }];
        // Keep last 30 points
        if (newData.length > 30) return newData.slice(newData.length - 30);
        return newData;
      });
      // Move cursor to end
      setCursor(prev => liveData.length - 1);
    };
    return () => ws.close();
  }, [liveData.length]);
"""

content = content.replace("function TelemetryPage() {", insert_hook)

with open(r'Nexus_841_-\src\routes\telemetry.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
