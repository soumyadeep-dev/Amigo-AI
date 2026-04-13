from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import io
from functools import lru_cache
import time

from database import (
    init_db, migrate_db, get_clients, get_logs,
    get_client_by_id, add_client, update_client,
    delete_client, add_log, get_logs_for_client,
    save_message, get_last_messages, clear_chat_history,
    save_uploaded_file, get_uploaded_files,
    update_invoice_amount, get_revenue_stats, get_monthly_revenue
)
from brain import ask_brain, get_daily_briefing, draft_email_from_text
from filehandler import parse_file

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
migrate_db()

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
    return {"message": "Client added"}

@app.put("/clients/{client_id}")
def edit_client(client_id: int, client: ClientModel):
    update_client(
        client_id, client.name, client.project,
        client.status, client.last_contact, client.payment_status
    )
    return {"message": "Client updated"}

@app.delete("/clients/{client_id}")
def remove_client(client_id: int):
    delete_client(client_id)
    return {"message": "Client deleted"}

@app.put("/clients/{client_id}/invoice")
def set_invoice(client_id: int, body: InvoiceUpdate):
    update_invoice_amount(client_id, body.amount)
    return {"message": "Invoice updated"}

# ─── Logs ────────────────────────────────────
@app.get("/clients/{client_id}/logs")
def get_client_logs(client_id: int):
    logs = get_logs_for_client(client_id)
    return [{"note": l[0], "date": l[1]} for l in logs]

@app.post("/clients/{client_id}/logs")
def add_client_log(client_id: int, log: LogModel):
    add_log(client_id, log.note, log.date)
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
    response = ask_brain(msg.question, msg.history)
    save_message("user",      msg.question)
    save_message("assistant", response)
    return {"response": response}

@app.get("/chat/history")
def chat_history():
    return get_last_messages(50)

@app.delete("/chat/history")
def clear_history():
    clear_chat_history()
    return {"message": "Cleared"}

# ─── AI ──────────────────────────────────────
briefing_cache = {"text": "", "timestamp": 0}

@app.get("/briefing")
def briefing():
    now = time.time()
    # Cache for 5 minutes (300 seconds)
    if briefing_cache["text"] and (now - briefing_cache["timestamp"]) < 300:
        return {"briefing": briefing_cache["text"]}
    
    result = get_daily_briefing()
    briefing_cache["text"]      = result
    briefing_cache["timestamp"] = now
    return {"briefing": result}

@app.post("/email/draft")
def draft_email(req: EmailRequest):
    draft = draft_email_from_text(
        req.client_name, req.user_request, req.client_context
    )
    return {"draft": draft}

# ─── Files ───────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents  = await file.read()
    mock_file = io.BytesIO(contents)
    mock_file.name = file.filename
    filetype, content, was_client_data, inserted = parse_file(mock_file)
    save_uploaded_file(file.filename, filetype, content)
    return {
        "message":         "File processed",
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