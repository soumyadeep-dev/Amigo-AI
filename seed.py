from database import get_connection, init_db

def seed():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executemany(
        "INSERT OR IGNORE INTO clients VALUES (?, ?, ?, ?, ?, ?)",
        [
            (1, 'Rahul Cafe', 'Logo Design', 'in progress', '2026-04-08', 'pending'),
            (2, 'Priya Boutique', 'Website Redesign', 'stalled', '2026-04-01', 'paid'),
            (3, 'Arjun Fitness', 'Social Media Kit', 'completed', '2026-04-10', 'pending'),
        ]
    )

    cursor.executemany(
        "INSERT OR IGNORE INTO logs VALUES (?, ?, ?, ?)",
        [
            (1, 1, 'Sent first logo draft via WhatsApp', '2026-04-05'),
            (2, 1, 'Client wants color changed to red', '2026-04-08'),
            (3, 2, 'Client went silent after first meeting', '2026-04-01'),
            (4, 3, 'Delivered all assets, invoice sent', '2026-04-10'),
        ]
    )

    conn.commit()
    conn.close()
    print("Database seeded successfully")

if __name__ == "__main__":
    seed()