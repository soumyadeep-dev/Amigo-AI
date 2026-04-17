import sqlite3
from datetime import datetime

DB_PATH = "brain.db"

def get_connection():
    # Adding timeout helps prevent "database is locked" errors during heavy local usage
    return sqlite3.connect(DB_PATH, timeout=10.0)

def init_db():
    # Using context manager ensures connection closes automatically
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY,
                name TEXT,
                project TEXT,
                status TEXT,
                last_contact TEXT,
                payment_status TEXT,
                invoice_amount REAL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY,
                client_id INTEGER,
                note TEXT,
                date TEXT,
                FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS uploaded_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                filetype TEXT,
                raw_content TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                client_id INTEGER,
                status TEXT DEFAULT 'todo',
                due_date TEXT,
                reminder_date TEXT,
                completed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
            );
        """)
        conn.commit()

def migrate_db():
    """Add new columns if they don't exist"""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            # We already added this to init_db above, but keeping for legacy migrations
            cursor.execute("ALTER TABLE clients ADD COLUMN invoice_amount REAL DEFAULT 0")
        except sqlite3.OperationalError:
            pass  # Column already exists
        try:
            cursor.execute("ALTER TABLE tasks ADD COLUMN reminder_date TEXT")
        except sqlite3.OperationalError:
            pass
        conn.commit()

# ─── Data Retrieval ─────────────────────────────────

def get_clients():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients")
        return cursor.fetchall()

def get_logs():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM logs")
        return cursor.fetchall()

def get_client_by_id(client_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clients WHERE id=?", (client_id,))
        return cursor.fetchone()

def get_logs_for_client(client_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT note, date FROM logs WHERE client_id=? ORDER BY date DESC",
            (client_id,)
        )
        return cursor.fetchall()

def get_uploaded_files():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT filename, filetype, raw_content, uploaded_at FROM uploaded_files ORDER BY uploaded_at DESC")
        return cursor.fetchall()

def get_last_messages(limit: int = 50):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

def get_tasks():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                t.id, t.title, t.client_id, t.status, t.due_date,
                t.reminder_date, t.completed, t.created_at, c.name
            FROM tasks t
            LEFT JOIN clients c ON c.id = t.client_id
            ORDER BY t.created_at DESC
        """)
        return cursor.fetchall()

# ─── Data Insertion & Updates ───────────────────────

def add_client(name, project, status, last_contact, payment_status, invoice_amount=0.0):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO clients (name, project, status, last_contact, payment_status, invoice_amount)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, project, status, last_contact, payment_status, invoice_amount))
        conn.commit()

def update_client(client_id, name, project, status, last_contact, payment_status):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE clients 
            SET name=?, project=?, status=?, last_contact=?, payment_status=?
            WHERE id=?
        """, (name, project, status, last_contact, payment_status, client_id))
        conn.commit()

def delete_client(client_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clients WHERE id=?", (client_id,))
        # The ON DELETE CASCADE in the schema handles the logs, but keeping this for safety
        cursor.execute("DELETE FROM logs WHERE client_id=?", (client_id,))
        cursor.execute("DELETE FROM tasks WHERE client_id=?", (client_id,))
        conn.commit()

def update_invoice_amount(client_id, amount):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE clients SET invoice_amount=? WHERE id=?",
            (float(amount), client_id)
        )
        conn.commit()

def add_log(client_id, note, date):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO logs (client_id, note, date) VALUES (?, ?, ?)",
            (client_id, note, date)
        )
        conn.commit()

def insert_client_from_file(name, project, status, last_contact, payment_status, invoice=0):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clients WHERE name = ? AND project = ?", (name, project))
        existing = cursor.fetchone()

        if not existing:
            cursor.execute(
                "INSERT INTO clients (name, project, status, last_contact, payment_status, invoice_amount) VALUES (?, ?, ?, ?, ?, ?)",
                (name, project, status, last_contact, payment_status, float(invoice))
            )
            conn.commit()

def insert_log_for_client(client_name, note, date):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM clients WHERE name = ?", (client_name,))
        client = cursor.fetchone()

        if client:
            cursor.execute(
                "INSERT INTO logs (client_id, note, date) VALUES (?, ?, ?)",
                (client[0], note, date)
            )
            conn.commit()

def save_message(role: str, content: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (role, content) VALUES (?, ?)",
            (role, content)
        )
        conn.commit()

def save_uploaded_file(filename: str, filetype: str, content: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO uploaded_files (filename, filetype, raw_content) VALUES (?, ?, ?)",
            (filename, filetype, content)
        )
        conn.commit()

def clear_chat_history():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chat_history")
        conn.commit()

# ─── Revenue Analytics ──────────────────────────────

def get_revenue_stats():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN payment_status='paid' THEN invoice_amount ELSE 0 END) as earned,
                SUM(CASE WHEN payment_status='pending' THEN invoice_amount ELSE 0 END) as pending,
                SUM(invoice_amount) as total
            FROM clients
        """)
        row = cursor.fetchone()
        return {
            "earned":  row[0] or 0,
            "pending": row[1] or 0,
            "total":   row[2] or 0
        }

def get_monthly_revenue():
    # Note: Relying on last_contact for revenue month might be inaccurate if contact happens after payment. 
    # For a future upgrade, consider adding a 'payment_date' column.
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                strftime('%Y-%m', last_contact) as month,
                SUM(CASE WHEN payment_status='paid' THEN invoice_amount ELSE 0 END) as earned
            FROM clients
            WHERE invoice_amount > 0 AND last_contact IS NOT NULL
            GROUP BY month
            ORDER BY month ASC
        """)
        return cursor.fetchall()

def get_client_by_name(name: str):
    """Finds a client by name using a loose search."""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Using LIKE allows "Nova" to match "Nova Tech"
        cursor.execute("SELECT * FROM clients WHERE name LIKE ?", (f"%{name}%",))
        return cursor.fetchone()

def update_client_status_only(client_id: int, new_payment_status: str):
    """Quick update for just the payment status."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE clients SET payment_status=? WHERE id=?", 
            (new_payment_status, client_id)
        )
        conn.commit()

def update_project_status_db(client_id: int, new_status: str):
    """Updates the project status (in progress, stalled, completed)"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE clients SET status=? WHERE id=?", (new_status, client_id))
        conn.commit()

def update_invoice_db(client_id: int, amount: float):
    """Updates the invoice amount securely"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE clients SET invoice_amount=? WHERE id=?", (float(amount), client_id))
        conn.commit()

def add_task(title, client_id=None, status="todo", due_date=None, reminder_date=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tasks (title, client_id, status, due_date, reminder_date, completed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (title, client_id, status, due_date, reminder_date, 1 if status == "done" else 0))
        conn.commit()

def update_task(task_id, title, client_id, status, due_date, reminder_date, completed):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE tasks
            SET title=?, client_id=?, status=?, due_date=?, reminder_date=?, completed=?
            WHERE id=?
        """, (title, client_id, status, due_date, reminder_date, completed, task_id))
        conn.commit()

def update_task_status(task_id, status):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE tasks SET status=?, completed=? WHERE id=?",
            (status, 1 if status == "done" else 0, task_id)
        )
        conn.commit()

def delete_task(task_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tasks WHERE id=?", (task_id,))
        conn.commit()
