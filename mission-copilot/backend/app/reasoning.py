import json
import openai

def analyze_telemetry(query: str, evidence: list):
    system_prompt = """You are ST-10 Mission Operations Copilot.
You must base your analysis ONLY on the provided evidence.
Return a JSON object with the following keys:
- observed_facts: list of facts drawn from evidence
- analysis: string containing your reasoning
- recommendations: list of actionable items
"""
    
    prompt = f"Query: {query}\n\nEvidence:\n{json.dumps(evidence)}\n"
    
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)
