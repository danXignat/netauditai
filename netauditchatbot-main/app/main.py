from fastapi import FastAPI
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

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

class PromptRequest(BaseModel):
    prompt: str

@app.post("/chat")
async def chat(req: PromptRequest):
    try:
        thread = openai.beta.threads.create()

        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=req.prompt
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

        return {"response": assistant_messages[0].content[0].text.value}

    except Exception as e:
        return {"error": str(e)}
