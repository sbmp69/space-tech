import requests

res = requests.post("http://127.0.0.1:8000/api/query", json={
    "query": "any anomalies",
    "mission_id": "ST10-DEMO-001"
})

print(res.status_code)
print(res.text)
