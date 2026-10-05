import os
from fastapi import APIRouter
import openai
from pydantic import BaseModel

class SitrepRequest(BaseModel):
    temperature: float
    voltage: float
    life_support: float

def generate_sitrep(data: SitrepRequest):
    system_prompt = "You are the ST-10 AI Copilot. The system is in an anomaly state. Write a very brief, 1-2 sentence SITREP (Situation Report) describing the anomaly and immediate recommended action based on the telemetry provided. Be urgent but professional."
    prompt = f"Current Telemetry:\nCore Temp: {data.temperature}C\nVoltage: {data.voltage}V\nLife Support: {data.life_support}%"
    
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content
