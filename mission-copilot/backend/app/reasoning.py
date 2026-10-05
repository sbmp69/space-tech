import json
import openai

def analyze_telemetry(query: str, evidence: list):
    system_prompt = """You are ST-10 Mission Operations Copilot.
If the provided evidence contains the answer, base your analysis ONLY on the provided evidence. Do NOT provide a website reference link.
If the provided evidence is empty or does NOT contain the answer, you must use your general pre-trained knowledge to answer the query. However, when you do this, you MUST append a website reference link (e.g., https://nasa.gov/..., https://en.wikipedia.org/...) to the end of the `analysis` string indicating where this information can be found online.

Return a JSON object with the following keys:
- observed_facts: list of facts drawn from evidence (or general knowledge if evidence is missing)
- analysis: string containing your reasoning (including the website link ONLY IF evidence was not used)
- recommendations: list of actionable items
"""
    
    prompt = f"Query: {query}\n\nEvidence:\n{json.dumps(evidence)}\n"
    
    response = openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)
