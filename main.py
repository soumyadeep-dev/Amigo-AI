from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import io
import time
from fastapi import UploadFile, File
from faster_whisper import WhisperModel

from database import (
    init_db, migrate_db, get_clients, get_logs,
    get_client_by_id, add_client, update_client,
    delete_client, add_log, get_logs_for_client,
    save_message, get_last_messages, clear_chat_history,
    save_uploaded_file, get_uploaded_files,
    update_invoice_amount, get_revenue_stats, get_monthly_revenue
)

# IMPORT build_vector_store so we can trigger memory updates
from brain import ask_brain, get_daily_briefing, draft_email_from_text, build_vector_store
from filehandler import parse_file

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB and build the AI's memory immediately on startup
init_db()
migrate_db()
build_vector_store() 

# ─── Models ──────────────────────────────────
class ClientModel(BaseModel):
    name:           str
    project:        str
    status:         str
    last_contact:   str
    payment_status: str

class LogModel(BaseModel):
    note: str
    date: str

class ChatMessage(BaseModel):
    question: str
    history:  list = []

class EmailRequest(BaseModel):
    client_name:    str
    user_request:   str
    client_context: str

class InvoiceUpdate(BaseModel):
    amount: float

# ─── Clients ─────────────────────────────────
@app.get("/clients")
def list_clients():
    clients = get_clients()
    keys    = ["id", "name", "project", "status",
               "last_contact", "payment_status", "invoice_amount"]
    return [dict(zip(keys, c)) if len(c) > 6
            else dict(zip(keys[:6], c)) | {"invoice_amount": 0}
            for c in clients]

@app.post("/clients")
def create_client(client: ClientModel):
    add_client(
        client.name, client.project, client.status,
        client.last_contact, client.payment_status
    )
    build_vector_store() # REFRESH AI MEMORY
    return {"message": "Client added"}

@app.put("/clients/{client_id}")
def edit_client(client_id: int, client: ClientModel):
    update_client(
        client_id, client.name, client.project,
        client.status, client.last_contact, client.payment_status
    )
    build_vector_store() # REFRESH AI MEMORY
    return {"message": "Client updated"}

@app.delete("/clients/{client_id}")
def remove_client(client_id: int):
    delete_client(client_id)
    build_vector_store() # REFRESH AI MEMORY
    return {"message": "Client deleted"}

@app.put("/clients/{client_id}/invoice")
def set_invoice(client_id: int, body: InvoiceUpdate):
    update_invoice_amount(client_id, body.amount)
    build_vector_store() # REFRESH AI MEMORY
    return {"message": "Invoice updated"}

# ─── Logs ────────────────────────────────────
@app.get("/clients/{client_id}/logs")
def get_client_logs(client_id: int):
    logs = get_logs_for_client(client_id)
    return [{"note": l[0], "date": l[1]} for l in logs]

@app.post("/clients/{client_id}/logs")
def add_client_log(client_id: int, log: LogModel):
    add_log(client_id, log.note, log.date)
    build_vector_store() # REFRESH AI MEMORY
    return {"message": "Log added"}

# ─── Revenue ─────────────────────────────────
@app.get("/revenue")
def revenue():
    return get_revenue_stats()

@app.get("/revenue/monthly")
def monthly_revenue():
    rows = get_monthly_revenue()
    return [{"month": r[0], "earned": r[1]} for r in rows]

# ─── Chat ────────────────────────────────────
@app.post("/chat")
def chat(msg: ChatMessage):
    try:
        response = ask_brain(msg.question, msg.history)
        save_message("user",      msg.question)
        save_message("assistant", response)
        return {"response": response}
    except Exception as e:
        # SaaS Guardrail: Prevent frontend crash if Ollama is offline
        return {"response": f"Connection error. Is Ollama running? Details: {str(e)}"}

@app.get("/chat/history")
def chat_history():
    return get_last_messages(50)

@app.delete("/chat/history")
def clear_history():
    clear_chat_history()
    return {"message": "Cleared"}

# Change "base.en" to "small.en" 
# (The first run will take a minute to download the new model)
whisper_model = WhisperModel("small.en", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    # 1. Use a fixed filename to prevent undefined/illegal char errors
    temp_file_path = f"temp_recording_{int(time.time())}.webm"
    
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await audio.read())
    
    try:
        # 2. Run transcription with VAD and a slightly higher temperature 
        # to prevent hallucinations on silence.
        segments, info = whisper_model.transcribe(
            temp_file_path, 
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=700) # Wait for clear silence
        )
        
        transcript = " ".join([segment.text for segment in segments]).strip()
        
        # Cleanup
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
        # 3. Final Hallucination Guard
        bad_words = ["you", "you.", "thank you", "thank you.", "subtitles", "be", "bye"]
        if transcript.lower() in bad_words or len(transcript) < 2:
            return {"transcript": ""}

        return {"transcript": transcript}
    
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        print(f"Transcription Error: {e}")
        return {"error": str(e)}

# ─── AI ──────────────────────────────────────
@app.get("/briefing")
def briefing():
    try:
        return {"briefing": get_daily_briefing()}
    except Exception as e:
        return {"briefing": "Could not generate briefing. Ensure Ollama is running."}

@app.post("/email/draft")
def draft_email(req: EmailRequest):
    try:
        draft = draft_email_from_text(
            req.client_name, req.user_request, req.client_context
        )
        return {"draft": draft}
    except Exception as e:
        return {"draft": "Error generating email. Ensure Ollama is running."}

# ─── Files ───────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents  = await file.read()
    mock_file = io.BytesIO(contents)
    mock_file.name = file.filename
    
    filetype, content, was_client_data, inserted = parse_file(mock_file)
    save_uploaded_file(file.filename, filetype, content)
    
    build_vector_store() # REFRESH AI MEMORY WITH NEW FILE
    
    return {
        "message":         "File processed and AI memory updated",
        "was_client_data": was_client_data,
        "inserted":        inserted
    }

@app.get("/files")
def list_files():
    files = get_uploaded_files()
    return [
        {"filename": f[0], "filetype": f[1], "uploaded_at": f[3]}
        for f in files
    ]