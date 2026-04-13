**🧠 Amigo AI**

User Guide & Documentation - v1.0

_Your private AI business brain for freelancers and small businesses_

# **1\. What is Amigo AI?**

Amigo AI is a local desktop application that acts as an intelligent business assistant for freelancers and small business owners. It helps you manage clients, track projects, monitor payments, and get AI-powered insights - all without your data ever leaving your computer.

_🔒 Privacy First: All your data is stored locally on your machine. The AI runs locally via Ollama. Nothing is sent to external servers._

### **Key Features**

- 📊 Smart Dashboard with real-time client and revenue metrics
- 👥 Full client management - add, edit, delete, filter clients
- 🧠 AI Daily Briefing - prioritized insights every time you open the app
- 💬 Chat with your AI brain - ask anything about your clients
- ✉️ AI Email Drafting - write emails in plain English, AI formats them
- 📁 File Upload - import clients from Excel/CSV, add context from PDF/TXT
- 💰 Revenue Tracker - track invoices, earned vs pending amounts
- 📝 Activity Logs - maintain a timeline of updates per client

# **2\. Dependencies**

Before running Amigo AI, ensure all the following are installed on your machine:

| **Dependency**   | **Purpose**            | **How to Install**           |
| ---------------- | ---------------------- | ---------------------------- |
| Python 3.10+     | Backend runtime        | python.org                   |
| pip              | Python package manager | Bundled with Python          |
| FastAPI          | REST API framework     | pip install fastapi          |
| Uvicorn          | ASGI server            | pip install uvicorn          |
| Ollama           | Local AI model runner  | ollama.com                   |
| llama3.2:3b      | AI model               | ollama pull llama3.2:3b      |
| pandas           | Excel/CSV parsing      | pip install pandas           |
| openpyxl         | Excel file support     | pip install openpyxl         |
| python-pptx      | PowerPoint parsing     | pip install python-pptx      |
| PyPDF2           | PDF parsing            | pip install PyPDF2           |
| python-multipart | File upload support    | pip install python-multipart |
| Node.js 18+      | Frontend runtime       | nodejs.org                   |
| npm              | Node package manager   | Bundled with Node.js         |
| React + Vite     | Frontend framework     | npm install (auto)           |
| Tailwind CSS     | UI styling             | npm install (auto)           |

_💡 Tip: If you use start.bat to launch the app, it will automatically check and install most Python and Node.js dependencies for you._

# **3\. Installation & Setup**

## **Step 1 - Install Ollama**

Download and install Ollama from <https://ollama.com>. Once installed, open a terminal and pull the AI model:

ollama pull llama3.2:3b

## **Step 2 - Install Python dependencies**

Open a terminal in the project root folder and run:

pip install fastapi uvicorn ollama pandas openpyxl python-pptx PyPDF2 python-multipart

## **Step 3 - Install frontend dependencies**

cd frontend

npm install

## **Step 4 - Start the app**

Double click start.bat in the project root folder. It will:

- Check all dependencies are installed
- Start the FastAPI backend on port 8000
- Start the React frontend on port 5173
- Open the app in your browser automatically

_⚠️ Ollama must be installed and running before starting the app. On Windows, Ollama starts automatically on boot._

# **4\. How the App Works - User Guide**

## **4.1 Dashboard**

The Dashboard is the first page you see when you open the app. It gives you a complete overview of your business at a glance.

### **What you see on the Dashboard:**

- Total Clients, In Progress, Stalled, Completed, Pending Payment, Overdue Follow-up metrics
- Revenue Overview - Total Earned, Pending Collection, Total Invoiced
- Monthly Revenue Bar Chart - shows revenue by month based on invoice amounts
- Project Status Donut Chart - visual breakdown of client statuses
- Days Since Last Contact - bar chart showing which clients you've ignored the longest
- AI Daily Briefing - AI analyzes all your clients and gives you a prioritized action list

### **AI Daily Briefing:**

Every time you open the Dashboard, the AI reads all your client data and generates a fresh briefing organized into High, Medium, and Low priority sections. Click Refresh to regenerate it anytime.

## **4.2 Clients Page**

The Clients page is where you manage all your client relationships.

### **Adding a client manually:**

Click the Add Client button in the top right. Fill in the client name, project, status, payment status, and last contact date. Click Save.

### **Client actions (buttons on each client card):**

- 👁️ View - expand full client details including invoice amount and activity log
- ✏️ Edit - update any client information
- 📝 Log - add a timestamped note to the client's activity timeline
- ✉️ Email - draft a professional email using plain English
- 🗑️ Delete - permanently remove the client and all their logs

### **Filtering clients:**

Use the filter buttons at the top of the client list to filter by Status (All / in progress / stalled / completed) or Payment (All / pending / paid).

### **Drafting an email:**

Click the ✉️ button on any client card. Type what you want to say in plain English - for example: 'remind him about the pending payment politely' or 'tell her the project is done and ask for final approval'. Click Generate Email and the AI will write a complete professional email with subject line and body, personalized using that client's data.

## **4.3 Chat Page**

The Chat page lets you have a conversation with your AI brain. It knows everything about your clients, projects, uploaded files, and past conversations.

### **Example questions you can ask:**

- 'Which clients have a pending payment?'
- 'Who should I follow up with today?'
- 'What is the status of Rahul's project?'
- 'Draft a follow up email for Priya Boutique'
- 'Summarize all my stalled projects'
- 'How much revenue is pending this month?'

Chat history is saved automatically and persists across sessions. The AI remembers the last 50 messages for context. Click the 🗑️ Clear button to start a fresh conversation.

# **5\. File Upload Guide**

Amigo AI supports uploading Excel, CSV, PDF, PowerPoint, and TXT files. Files can be uploaded from both the Dashboard and the Chat page.

## **5.1 Excel & CSV Files (Structured Client Data)**

Excel and CSV files are treated as structured client data. When you upload them, Amigo AI automatically reads the columns, maps them to client fields, and inserts new clients into your dashboard.

### **How your Excel should look:**

| **Name**       | **Project**      | **Status**  | **Payment** | **Last Contact** | **Notes**                           | **Invoice Amount** |
| -------------- | ---------------- | ----------- | ----------- | ---------------- | ----------------------------------- | ------------------ |
| Rahul Cafe     | Logo Design      | in progress | pending     | 2026-04-10       | Sent first draft, awaiting feedback | 25000              |
| Priya Boutique | Website Redesign | stalled     | paid        | 2026-03-28       | Client went silent after deposit    | 45000              |
| Arjun Fitness  | Social Media Kit | completed   | pending     | 2026-04-11       | All files delivered, invoice unpaid | 18000              |

### **Supported column names (case-insensitive):**

- **Name, Client, Client Name, Company, Business**
- **Project, Project Name, Work, Service, Job**
- **Status, Project Status, State**
- **Payment, Payment Status, Paid, Payment_Status**
- **Last Contact, Last_Contact, Date, Contact Date, Last Seen**
- **Notes, Note, Update, Updates, Comments, Description**
- **Invoice, Invoice Amount, Amount, Fee, Price, Cost, Invoice_Amount**

_✅ Minimum required columns: Name and Project. All other columns are optional and will default to safe values if missing (Status → 'in progress', Payment → 'pending', Invoice → 0)._

### **What happens after upload:**

- New clients are automatically added to your Dashboard and Clients page
- Charts and metrics update immediately
- Notes column is saved as the first activity log entry for each client
- Invoice amounts are stored and reflected in the Revenue Overview
- Duplicate clients (same name + project) are skipped automatically

_⚠️ Existing clients with the same name and project will NOT be duplicated. Upload the same file multiple times safely._

## **5.2 PDF Files**

PDF files are not parsed as structured client data. Instead, the text content is extracted and stored as context for your AI brain.

### **Best use cases for PDF upload:**

- Meeting notes or call summaries
- Client briefs and project requirements
- Contracts or agreements (for reference)
- Proposals you have sent to clients

### **Example PDF content that works well:**

_Meeting Notes - April 12, 2026 Spoke with Rahul Cafe today. They approved the second logo draft. Need to send final files by April 15. Payment of ₹25,000 still pending. New lead: Preethi Salon interested in a complete brand package. Budget around ₹30,000. Follow up call scheduled for April 14._

After uploading a PDF, go to the Chat page and ask questions like:

- 'What was discussed in the meeting notes?'
- 'What is the deadline for Rahul?'
- 'Who is the new lead and what is their budget?'

_ℹ️ PDF content does NOT update your Dashboard metrics or client list. It is only available as AI context for the Chat page._

## **5.3 TXT Files**

Plain text files work similarly to PDFs - the content is stored as AI context and can be queried in the Chat page.

### **Example TXT file format:**

_Client: Meera Wellness Status: Waiting for content approval since March 30 Next action: Send reminder email by April 14 Budget: ₹45,000 paid in full Client: Nova Tech Video script approved on April 9 Animation in progress, delivery expected April 20 Payment: ₹60,000 pending_

TXT files are great for quick notes, meeting summaries, client conversations copied from WhatsApp, or any unstructured information you want the AI to know about.

## **5.4 PowerPoint Files**

PowerPoint files are parsed slide by slide. All text from each slide is extracted and stored as AI context. Useful for uploading client presentations, pitch decks, or project briefs in PPTX format.

## **5.5 File Upload Summary**

| **File Type** | **Updates Dashboard** | **AI Can Answer Questions** | **Use Case**          |
| ------------- | --------------------- | --------------------------- | --------------------- |
| Excel / CSV   | ✅ Yes                | ✅ Yes                      | Client data import    |
| PDF           | ❌ No                 | ✅ Yes                      | Meeting notes, briefs |
| TXT           | ❌ No                 | ✅ Yes                      | Quick notes, updates  |
| PowerPoint    | ❌ No                 | ✅ Yes                      | Presentations, decks  |

# **6\. Frequently Asked Questions**

### **Q: Does my data go to the internet?**

No. All your client data is stored locally in a SQLite database on your machine. The AI model (Llama 3.2) runs locally via Ollama. Nothing is sent to external servers.

### **Q: Can I use this on multiple devices?**

Currently Amigo AI is designed for single-device use. Your data stays on the machine where the app is installed.

### **Q: What if the AI briefing is slow?**

The AI briefing generates fresh insights every time the Dashboard loads. Generation time depends on your hardware. With an RTX 3050 GPU and Llama 3.2 3B model, expect 10-30 seconds. Upgrading to 16GB RAM will significantly improve speed.

### **Q: Can I upload the same Excel file twice?**

Yes. Duplicate clients (same name + same project) are automatically skipped. You can safely re-upload files without creating duplicates.

### **Q: What happens if Ollama is not running?**

The Dashboard, Clients page, and file upload will still work normally. Only AI features (Daily Briefing, Chat, Email Drafting) will fail. Ollama starts automatically on Windows boot after installation.

### **Q: How do I stop the app?**

Double click stop.bat in the project root folder. This will shut down the backend and frontend servers cleanly.

# **7\. Troubleshooting**

### **App doesn't open in browser**

- Make sure both uvicorn and npm dev server are running (check terminals)
- Try opening <http://localhost:5173> manually in your browser

### **AI briefing shows an error**

- Check that Ollama is running - open a terminal and type: ollama ps
- Make sure you pulled the model: ollama pull llama3.2:3b

### **Excel upload shows 0 clients added**

- Check your column names match the supported names listed in Section 5.1
- Make sure the file has at least a Name and Project column
- Try saving the file as CSV and uploading again

### **Backend fails to start**

- Make sure Python is in your system PATH
- Run: pip install fastapi uvicorn in your terminal
- Check that port 8000 is not already in use

_Amigo AI - Your Private Business Brain_

Built with FastAPI · React · Ollama · SQLite
