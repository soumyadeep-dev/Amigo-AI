import ollama
import faiss
import numpy as np
from datetime import date
from sentence_transformers import SentenceTransformer

# Cleaned up and consolidated imports
from database import (
    get_clients, get_logs, get_uploaded_files,
    get_client_by_name, update_client_status_only, add_log,
    update_project_status_db, update_invoice_db
)

# Load embedding model once
model = SentenceTransformer("all-MiniLM-L6-v2")

# Global FAISS index (Now ONLY for files)
index = None
documents = []

def build_vector_store():
    """Now purely indexes Unstructured Data (Files) so large PDFs don't crash the AI."""
    global index, documents
    uploaded = get_uploaded_files()
    documents = []

    for file in uploaded:
        filename, filetype, raw_content, uploaded_at = file
        # Chunking large files so the AI can search them
        clean_text = raw_content[:5000] # Increased limit safely
        chunks = [clean_text[i:i+800] for i in range(0, len(clean_text), 800)]
        
        for chunk in chunks:
            documents.append(f"[FILE: {filename}]\n{chunk}")

    if not documents:
        index = None
        return

    embeddings = model.encode(documents)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))

def get_file_context(question, k=3):
    """Searches only the uploaded documents."""
    global index, documents
    if index is None or not documents:
        return "No files uploaded."

    query_vector = model.encode([question])
    distances, indices = index.search(np.array(query_vector).astype('float32'), k)

    results = []
    for i in indices[0]:
        if i < len(documents) and i != -1:
            results.append(documents[i])

    return "\n---\n".join(results)

def get_full_db_context():
    """Pulls ALL clients directly so the AI never misses one."""
    clients = get_clients()
    if not clients:
        return "No clients in database."
        
    context = "=== ALL ACTIVE CLIENTS ===\n"
    for c in clients:
        # Keeping it lightweight to save tokens: ID, Name, Project, Status, Payment, Invoice
        invoice = c[6] if len(c) > 6 else 0
        context += f"- {c[1]} | Project: {c[2]} | Status: {c[3]} | Paid: {c[5]} | ₹{invoice:,.0f}\n"
    
    return context


# ==============================
# AI TOOLS (The Agent's Hands)
# ==============================
def change_payment_status(client_name: str, payment_status: str) -> str:
    """
    Changes a client's payment status to either 'paid' or 'pending'.
    Use this when a user says a client has paid, or a payment is pending/due.
    CRITICAL: Also use this if the user says "mark their invoice as paid" or "invoice is paid".
    """
    client = get_client_by_name(client_name)
    if not client: return f"Error: Could not find client '{client_name}'."
    
    update_client_status_only(client[0], payment_status)
    add_log(client[0], f"Payment status marked as {payment_status} via AI", str(date.today()))
    build_vector_store()
    return f"✅ **{client[1]}** payment status updated to `{payment_status}`."

def change_project_status(client_name: str, project_status: str) -> str:
    """
    Changes a client's project status. Valid options are 'in progress', 'stalled', or 'completed'.
    Use this when a user says a project is blocked, finished, or ongoing.
    """
    client = get_client_by_name(client_name)
    if not client: return f"Error: Could not find client '{client_name}'."
    
    update_project_status_db(client[0], project_status)
    add_log(client[0], f"Project marked as {project_status} via AI", str(date.today()))
    build_vector_store()
    return f"✅ **{client[1]}** project status updated to `{project_status}`."

def update_invoice(client_name: str, amount: float) -> str:
    """
    Updates the total invoice amount/fee for a client.
    CRITICAL: ONLY use this tool if the user explicitly provides a NEW NUMBER or CURRENCY AMOUNT. 
    Do NOT use this tool if they just say "mark invoice as paid".
    """
    client = get_client_by_name(client_name)
    if not client: return f"Error: Could not find client '{client_name}'."
    
    update_invoice_db(client[0], float(amount))
    add_log(client[0], f"Invoice updated to ₹{float(amount):,.0f} via AI", str(date.today()))
    build_vector_store()
    return f"✅ **{client[1]}** invoice updated to **₹{float(amount):,.0f}**."


# ==============================
# MAIN AI FUNCTION (The Master Router)
# ==============================
def ask_brain(question: str, chat_history: list = []):
    db_context = get_full_db_context()
    file_context = get_file_context(question)

    messages = [
        {
            "role": "system",
            "content": f"""You are 'Amigo', a high-performance Business Assistant.
You have tools to update the database. If the user commands you to update a status, payment, or invoice, USE THE APPROPRIATE TOOL.
If no action is required, answer the question using the context below.

RULES:
1. When asked to list clients, include EVERY client from the Database Context using a Markdown table.
2. Be concise and actionable. Use bold text for currency (₹).
3. If a user asks you to do multiple things in one sentence (e.g., "Client X is completed and mark their invoice as paid"), you MUST trigger multiple tools for that SAME client. "Their", "them", or implied subjects always refer to the client just mentioned.

DATABASE CONTEXT:
{db_context}

FILE CONTEXT:
{file_context}
"""
        }
    ]

    messages += chat_history[-6:]
    messages.append({"role": "user", "content": question})

    # Pass all three tools to Ollama
    response = ollama.chat(
        model="llama3.1:8b",
        messages=messages,
        tools=[change_payment_status, change_project_status, update_invoice],
        options={"temperature": 0.2}
    )

    # ==============================
    # DYNAMIC TOOL INTERCEPTOR
    # ==============================
    if response.get("message", {}).get("tool_calls"):
        results = []
        for tool in response["message"]["tool_calls"]:
            name = tool["function"]["name"]
            args = tool["function"]["arguments"]
            
            if name == "change_payment_status":
                results.append(change_payment_status(args.get("client_name"), args.get("payment_status")))
            
            elif name == "change_project_status":
                results.append(change_project_status(args.get("client_name"), args.get("project_status")))
                
            elif name == "update_invoice":
                # Ensure the AI didn't pass a string with commas by accident
                raw_amt = str(args.get("amount")).replace(",", "").replace("₹", "")
                results.append(update_invoice(args.get("client_name"), float(raw_amt)))

        # Combine all the success messages and send them to the React UI
        return "\n".join(results)

    # If no tool was used, return text normally
    return response["message"]["content"]


def get_daily_briefing():
    prompt = """Analyze the DATABASE CONTEXT. Give me a 3-part briefing using EXACTLY these headers (DO NOT bold the headers, do not use asterisks around them):

URGENT:
(List ONLY clients with 'pending' payment. Generate a Markdown table with exactly these 4 columns: | Client | Project | Status | Amount |)

STALLED:
(List ONLY clients with 'stalled' status. Generate a Markdown table with exactly these 4 columns: | Client | Project | Paid | Amount |)

NEXT STEPS:
(List exactly 3 bullet points of actions I should take today based on the data.)
"""
    return ask_brain(prompt)


def draft_email_from_text(client_name: str, user_request: str, client_context: str):
    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {
                "role": "system",
                "content": "You are a professional email ghostwriter for freelancers. Write a warm, human, yet concise email. Output Subject and Body ONLY."
            },
            {
                "role": "user",
                "content": f"Target Client: {client_name}\nContext: {client_context}\nGoal: {user_request}"
            }
        ],
        options={"temperature": 0.7}
    )
    return response["message"]["content"]