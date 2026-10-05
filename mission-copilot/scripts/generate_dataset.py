import json
import random
import uuid
from datetime import datetime, timezone

def generate_telemetry():
    data = []
    mission_id = "M-1001"
    subsystems = ["Propulsion", "LifeSupport", "Thermal", "Power"]
    for i in range(100):
        anomaly = random.choice([True, False]) if i % 10 == 0 else False
        subsystem = random.choice(subsystems)
        if subsystem == "Thermal":
            param = "temperature"
            val = random.uniform(80.0, 100.0) if anomaly else random.uniform(20.0, 30.0)
            unit = "Celsius"
        else:
            param = "pressure"
            val = random.uniform(3.0, 5.0) if anomaly else random.uniform(1.0, 2.0)
            unit = "atm"
            
        data.append({
            "mission_id": mission_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "subsystem": subsystem,
            "parameter": param,
            "value": val,
            "unit": unit,
            "is_anomaly": anomaly
        })
    with open("dataset.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Dataset generated in dataset.json")

if __name__ == "__main__":
    generate_telemetry()
