from fastapi import FastAPI
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from typing import Any

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
assistant_id = os.getenv("OPENAI_ASSISTANT_ID")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    performance_assessment: Any = None
    network_scan_result: Any = None
    packet_tracer_result: Any = None

@app.post("/analyze")
async def analyze(req: AnalysisRequest):
    try:
        analysis_prompt = f"""
You are a senior network-security & performance analyst.

The following scan results are provided as raw JSON (do not alter their formatting):

**Performance Assessment:**  
{req.performance_assessment}

**Network Scan Results:**  
{req.network_scan_result}

**Packet Tracer Results:**  
{req.packet_tracer_result}

Produce one comprehensive security & performance report in Markdown, structured exactly as follows:

# Executive Summary  
- ≤ 200 words, plain language for a non-technical manager  
- Two overall scores: **Risk score A–F** (A=Excellent, F=Critical) and **Performance score 1–5** (1=Poor, 5=Excellent)  
- Emphasize “why it matters,” not just raw metrics  

## Detailed Findings  

### 1. Security Posture  
- List each host → open-port/service (cite JSON file and line).  
- Flag risky services (e.g., SMB 445, MS-RPC high ports, SSH on Windows).  
- Map each risky service to at least one CVE, NIST guideline, or industry best practice.  
- Rate each host’s exposure on a 4-level scale (Critical · High · Moderate · Low) with justification.  

### 2. Suspicious Traffic  
- Parse **packet_tracer_result.json**; any entry beginning `[!]` is suspect (cite line).  
- Explain in depth *why* it’s suspicious (e.g., multicast mDNS 224.0.0.251 → rogue discovery).  
- Propose concrete containment or monitoring steps, with pros & cons.  

### 3. Performance Health  
- From **performance_assessment.json**, compute for every flow/socket:  
  - average throughput in Mbps  
  - packets per second  
  - goodput (%)  
- Identify flows that are either < 10% of the fastest throughput *or* duration > 95th percentile; analyze probable root causes (RTT, loss, window size, server slowness).  
- Include illustrative examples of any spikes or plateaus.  

## Recommendations Table  
- At least one **quick win** (firewall rule / patch / config) **and** one **strategic** item (e.g., network segmentation, long-term monitoring).  
- For each recommendation, specify: expected benefit, risk mitigated, and estimated implementation time.  

Whenever you reference a value, clearly state which JSON file and line number it came from. Do **not** use emojis or tables; maintain a professional, detailed tone.
"""

        thread = openai.beta.threads.create()

        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=analysis_prompt
        )

        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )

        while True:
            run_status = openai.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )
            if run_status.status in ["completed", "failed", "cancelled"]:
                break

        if run_status.status != "completed":
            return {"error": f"Run status: {run_status.status}"}

        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        assistant_messages = [
            m for m in messages.data if m.role == "assistant"
        ]

        if not assistant_messages:
            return {"error": "No assistant message found"}

        return {"analysis": assistant_messages[0].content[0].text.value}

    except Exception as e:
        return {"error": str(e)}