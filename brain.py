import ollama
from database import get_clients, get_logs, get_last_messages, get_uploaded_files

def build_context():
    clients = get_clients()
    logs    = get_logs()

    context = ""

    if clients:
        context += "=== CLIENT DATA ===\n"
        for client in clients:
            id, name, project, status, last_contact, payment = client[:6]
            invoice     = client[6] if len(client) > 6 else 0
            client_logs = [l for l in logs if l[1] == id]
            log_text    = "\n".join([f"  - {l[3]}: {l[2]}" for l in client_logs])
            context += f"""
Client: {name}
Project: {project}
Status: {status}
Last Contact: {last_contact}
Payment: {payment}
Invoice Amount: ₹{invoice or 0:,.0f}
Updates:
{log_text}
---
"""

    uploaded = get_uploaded_files()
    if uploaded:
        context += "\n=== UPLOADED FILES ===\n"
        for file in uploaded:
            filename, filetype, raw_content, uploaded_at = file
            context += f"\nFile: {filename} (uploaded {uploaded_at})\n"
            context += raw_content[:3000]
            context += "\n---\n"

    return context

def ask_brain(question: str, chat_history: list = []):
    context = build_context()

    messages = [
        {
            "role": "system",
            "content": f"""You are a smart business assistant for a freelancer.
You have access to their client and project data below.

When the user asks you to write, draft, or create an email:
- Write a complete professional email with Subject line and body
- Use the client data to personalize it
- Keep it concise, warm and human
- Format it clearly with Subject: on first line then the email body

For all other questions give clear, concise, actionable insights.
Be direct and specific.

Current client data:
{context}"""
        }
    ]

    messages += chat_history
    messages.append({"role": "user", "content": question})

    response = ollama.chat(
        model="llama3.1:8b",
        messages=messages
    )

    return response["message"]["content"]

def get_daily_briefing():
    return ask_brain(
        "Analyze all clients and uploaded data. Give me a prioritized briefing of what I should focus on today. Format it clearly with High, Medium and Low priority sections."
    )

def draft_email_from_text(client_name: str, user_request: str, client_context: str):
    response = ollama.chat(
        model="llama3.1:8b",
        messages=[
            {
                "role": "system",
                "content": """You are a professional email writer for freelancers.
Write a complete, professional email based on the user's request and client context.
Format strictly as:
Subject: [subject line]

[email body]

Keep it concise, warm, and human. No explanations or extra text — just the email."""
            },
            {
                "role": "user",
                "content": f"""Client: {client_name}
Client context: {client_context}

User request: {user_request}

Write the email."""
            }
        ]
    )
    return response["message"]["content"]