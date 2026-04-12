import sqlite3

DB_PATH = "brain.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY,
            name TEXT,
            project TEXT,
            status TEXT,
            last_contact TEXT,
            payment_status TEXT
        );

        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY,
            client_id INTEGER,
            note TEXT,
            date TEXT
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
    """)

    conn.commit()
    conn.close()

def get_clients():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients")
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_logs():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM logs")
    rows = cursor.fetchall()
    conn.close()
    return rows

def save_message(role: str, content: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO chat_history (role, content) VALUES (?, ?)",
        (role, content)
    )
    conn.commit()
    conn.close()

def get_last_messages(limit: int = 50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?",
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

def save_uploaded_file(filename: str, filetype: str, content: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO uploaded_files (filename, filetype, raw_content) VALUES (?, ?, ?)",
        (filename, filetype, content)
    )
    conn.commit()
    conn.close()

def get_uploaded_files():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filename, filetype, raw_content, uploaded_at FROM uploaded_files ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return rows

def clear_chat_history():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_history")
    conn.commit()
    conn.close()

def insert_client_from_file(name, project, status, last_contact, payment_status):
    conn = get_connection()
    cursor = conn.cursor()

    # Check if client already exists
    cursor.execute("SELECT id FROM clients WHERE name = ?", (name,))
    existing = cursor.fetchone()

    if not existing:
        cursor.execute(
            "INSERT INTO clients (name, project, status, last_contact, payment_status) VALUES (?, ?, ?, ?, ?)",
            (name, project, status, last_contact, payment_status)
        )
        conn.commit()

    conn.close()

def insert_log_for_client(client_name, note, date):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM clients WHERE name = ?", (client_name,))
    client = cursor.fetchone()

    if client:
        cursor.execute(
            "INSERT INTO logs (client_id, note, date) VALUES (?, ?, ?)",
            (client[0], note, date)
        )
        conn.commit()

    conn.close()

def update_client(client_id, name, project, status, last_contact, payment_status):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE clients 
        SET name=?, project=?, status=?, last_contact=?, payment_status=?
        WHERE id=?
    """, (name, project, status, last_contact, payment_status, client_id))
    conn.commit()
    conn.close()

def delete_client(client_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clients WHERE id=?", (client_id,))
    cursor.execute("DELETE FROM logs WHERE client_id=?", (client_id,))
    conn.commit()
    conn.close()

def add_client(name, project, status, last_contact, payment_status):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO clients (name, project, status, last_contact, payment_status)
        VALUES (?, ?, ?, ?, ?)
    """, (name, project, status, last_contact, payment_status))
    conn.commit()
    conn.close()

def add_log(client_id, note, date):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO logs (client_id, note, date) VALUES (?, ?, ?)",
        (client_id, note, date)
    )
    conn.commit()
    conn.close()

def get_logs_for_client(client_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT note, date FROM logs WHERE client_id=? ORDER BY date DESC",
        (client_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return rows

def migrate_db():
    """Add new columns if they don't exist"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE clients ADD COLUMN invoice_amount REAL DEFAULT 0")
    except:
        pass  # Column already exists
    conn.commit()
    conn.close()

def get_client_by_id(client_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients WHERE id=?", (client_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def update_invoice_amount(client_id, amount):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE clients SET invoice_amount=? WHERE id=?",
        (amount, client_id)
    )
    conn.commit()
    conn.close()

def get_revenue_stats():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            SUM(CASE WHEN payment_status='paid' THEN invoice_amount ELSE 0 END) as earned,
            SUM(CASE WHEN payment_status='pending' THEN invoice_amount ELSE 0 END) as pending,
            SUM(invoice_amount) as total
        FROM clients
    """)
    row = cursor.fetchone()
    conn.close()
    return {
        "earned":  row[0] or 0,
        "pending": row[1] or 0,
        "total":   row[2] or 0
    }

def get_monthly_revenue():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            strftime('%Y-%m', last_contact) as month,
            SUM(CASE WHEN payment_status='paid' THEN invoice_amount ELSE 0 END) as earned
        FROM clients
        WHERE invoice_amount > 0
        GROUP BY month
        ORDER BY month ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return rows