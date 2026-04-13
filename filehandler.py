import pandas as pd
from pptx import Presentation
from PyPDF2 import PdfReader
import io
from datetime import date
from database import insert_client_from_file, insert_log_for_client

# Column name variations people might use
NAME_COLS    = ["name", "client", "client name", "company", "business"]
PROJECT_COLS = ["project", "project name", "work", "service", "job"]
STATUS_COLS  = ["status", "project status", "state"]
PAYMENT_COLS = ["payment", "payment status", "paid", "payment_status"]
CONTACT_COLS = ["last contact", "last_contact", "date", "contact date", "last seen"]
NOTES_COLS   = ["notes", "note", "update", "updates", "comments", "description"]
INVOICE_COLS = ["invoice", "invoice amount", "amount", "fee", "price", "cost", "invoice_amount"]

def match_col(columns, options):
    """Find matching column name case-insensitively"""
    columns_lower = [c.lower().strip() for c in columns]
    for option in options:
        if option in columns_lower:
            return columns[columns_lower.index(option)]
    return None

def try_insert_as_clients(df):
    """Try to map dataframe columns to clients table and insert"""
    cols = df.columns.tolist()

    name_col    = match_col(cols, NAME_COLS)
    project_col = match_col(cols, PROJECT_COLS)

    # Need at least name and project to treat as client data
    if not name_col or not project_col:
        return False, 0

    status_col  = match_col(cols, STATUS_COLS)
    payment_col = match_col(cols, PAYMENT_COLS)
    contact_col = match_col(cols, CONTACT_COLS)
    notes_col   = match_col(cols, NOTES_COLS)
    invoice_col = match_col(cols, INVOICE_COLS)

    inserted = 0
    today    = str(date.today())

    for _, row in df.iterrows():
        name    = str(row[name_col]).strip()
        project = str(row[project_col]).strip()

        if not name or name == "nan":
            continue

        status         = str(row[status_col]).strip()  if status_col  and str(row[status_col])  != "nan" else "in progress"
        payment_status = str(row[payment_col]).strip() if payment_col and str(row[payment_col]) != "nan" else "pending"
        last_contact   = str(row[contact_col]).strip() if contact_col and str(row[contact_col]) != "nan" else today

        # Parse invoice amount — strip ₹, commas, spaces
        invoice = 0
        if invoice_col and str(row[invoice_col]) != "nan":
            try:
                invoice = float(
                    str(row[invoice_col])
                    .replace(',', '')
                    .replace('₹', '')
                    .replace('Rs', '')
                    .replace('rs', '')
                    .strip()
                )
            except:
                invoice = 0

        insert_client_from_file(name, project, status, last_contact, payment_status, invoice)

        # Insert notes as a log entry
        if notes_col and str(row[notes_col]) != "nan":
            note = str(row[notes_col]).strip()
            insert_log_for_client(name, note, today)

        inserted += 1

    return True, inserted

def parse_file(uploaded_file):
    filename = uploaded_file.name
    filetype = filename.split(".")[-1].lower()
    content  = ""
    inserted = 0
    was_client_data = False

    try:
        if filetype in ["xlsx", "xls"]:
            df = pd.read_excel(uploaded_file)
            was_client_data, inserted = try_insert_as_clients(df)
            content  = f"Spreadsheet with {len(df)} rows and {len(df.columns)} columns.\n\n"
            content += f"Columns: {', '.join(df.columns.tolist())}\n\n"
            content += df.to_string(index=False)

        elif filetype == "csv":
            df = pd.read_csv(uploaded_file)
            was_client_data, inserted = try_insert_as_clients(df)
            content  = f"Spreadsheet with {len(df)} rows and {len(df.columns)} columns.\n\n"
            content += f"Columns: {', '.join(df.columns.tolist())}\n\n"
            content += df.to_string(index=False)

        elif filetype == "pptx":
            prs     = Presentation(uploaded_file)
            content = ""
            for i, slide in enumerate(prs.slides):
                content += f"\n--- Slide {i+1} ---\n"
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        content += shape.text.strip() + "\n"

        elif filetype == "pdf":
            reader  = PdfReader(uploaded_file)
            content = ""
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    content += f"\n--- Page {i+1} ---\n{text}"

        elif filetype == "txt":
            content = uploaded_file.read().decode("utf-8")

        else:
            content = f"Unsupported file type: {filetype}"

    except Exception as e:
        content = f"Error parsing file: {str(e)}"

    return filetype, content, was_client_data, inserted