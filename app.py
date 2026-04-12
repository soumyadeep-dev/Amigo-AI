import streamlit as st
import plotly.express as px
import pandas as pd
from datetime import date
from brain import ask_brain, get_daily_briefing, draft_email_from_text
from database import (
    init_db, get_clients, get_logs,
    save_message, get_last_messages,
    save_uploaded_file, get_uploaded_files,
    clear_chat_history, add_client, update_client,
    delete_client, add_log, get_logs_for_client,
    get_client_by_id, update_invoice_amount,
    get_revenue_stats, get_monthly_revenue, migrate_db
)
from filehandler import parse_file

init_db()
migrate_db()

st.set_page_config(
    page_title="AI Brain",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .main { background-color: #f8f9fa; }
    .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border-left: 4px solid #4f8ef7;
        margin-bottom: 1rem;
    }
    .metric-card.warning { border-left-color: #f7a94f; }
    .metric-card.danger  { border-left-color: #f74f4f; }
    .metric-card.success { border-left-color: #4fcf70; }
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #1a1a2e;
        margin: 0;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #6b7280;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .section-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #f0f0f0;
    }
    .client-card {
        background: white;
        padding: 1rem 1.25rem;
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        margin-bottom: 0.75rem;
    }
    .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-progress { background: #dbeafe; color: #1d4ed8; }
    .badge-stalled  { background: #fef3c7; color: #b45309; }
    .badge-complete { background: #dcfce7; color: #15803d; }
    div[data-testid="stSidebarNav"] { display: none; }
</style>
""", unsafe_allow_html=True)

# ─── Sidebar ─────────────────────────────────
with st.sidebar:
    st.markdown("### 🧠 AI Brain")
    st.markdown("---")
    page = st.radio("", ["📊 Dashboard", "💬 Chat"], label_visibility="collapsed")
    st.markdown("---")

    st.markdown("### ➕ Add Client")
    with st.form("add_client_form"):
        new_name    = st.text_input("Client Name")
        new_project = st.text_input("Project")
        new_status  = st.selectbox("Status", ["in progress", "stalled", "completed"])
        new_payment = st.selectbox("Payment", ["pending", "paid"])
        new_contact = st.date_input("Last Contact", value=date.today())
        submitted   = st.form_submit_button("Add Client")

        if submitted:
            if new_name and new_project:
                add_client(new_name, new_project, new_status,
                           str(new_contact), new_payment)
                st.success(f"✅ {new_name} added!")
                st.rerun()
            else:
                st.error("Name and project are required")

    st.markdown("---")
    st.caption("Powered by Llama 3.2 · Local AI")

# ─── Helper ──────────────────────────────────
def get_dataframes(status_filter=None, payment_filter=None):
    clients = get_clients()
    logs    = get_logs()

    if not clients:
        df_clients = pd.DataFrame(columns=[
            "id", "name", "project", "status",
            "last_contact", "payment_status", "invoice_amount"
        ])
    else:
        cols = ["id", "name", "project", "status", "last_contact", "payment_status"]
        if len(clients[0]) > 6:
            cols.append("invoice_amount")
        df_clients = pd.DataFrame(clients, columns=cols)
        if "invoice_amount" not in df_clients.columns:
            df_clients["invoice_amount"] = 0

    df_logs = pd.DataFrame(logs, columns=["id", "client_id", "note", "date"]) \
              if logs else pd.DataFrame(columns=["id", "client_id", "note", "date"])

    if not df_clients.empty:
        df_clients["last_contact"]       = pd.to_datetime(df_clients["last_contact"])
        df_clients["days_since_contact"] = (
            pd.Timestamp.now() - df_clients["last_contact"]
        ).dt.days

    if status_filter and status_filter != "All":
        df_clients = df_clients[df_clients["status"] == status_filter]
    if payment_filter and payment_filter != "All":
        df_clients = df_clients[df_clients["payment_status"] == payment_filter]

    return df_clients, df_logs

# ─── Dashboard ───────────────────────────────
if page == "📊 Dashboard":

    st.markdown("## Greetings Boss 👋")
    st.markdown(f"*{date.today().strftime('%A, %B %d %Y')} · Here's your business at a glance*")
    st.markdown("---")

    df_all, df_logs = get_dataframes()

    # ── Client Metrics
    total       = len(df_all)
    in_progress = len(df_all[df_all["status"] == "in progress"])     if not df_all.empty else 0
    stalled     = len(df_all[df_all["status"] == "stalled"])         if not df_all.empty else 0
    completed   = len(df_all[df_all["status"] == "completed"])       if not df_all.empty else 0
    pending_pay = len(df_all[df_all["payment_status"] == "pending"]) if not df_all.empty else 0
    overdue     = len(df_all[df_all["days_since_contact"] > 7])      if not df_all.empty else 0

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    with c1:
        st.markdown(f"""<div class="metric-card">
            <p class="metric-label">Total Clients</p>
            <p class="metric-value">{total}</p>
        </div>""", unsafe_allow_html=True)
    with c2:
        st.markdown(f"""<div class="metric-card success">
            <p class="metric-label">In Progress</p>
            <p class="metric-value">{in_progress}</p>
        </div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""<div class="metric-card warning">
            <p class="metric-label">Stalled</p>
            <p class="metric-value">{stalled}</p>
        </div>""", unsafe_allow_html=True)
    with c4:
        st.markdown(f"""<div class="metric-card success">
            <p class="metric-label">Completed</p>
            <p class="metric-value">{completed}</p>
        </div>""", unsafe_allow_html=True)
    with c5:
        st.markdown(f"""<div class="metric-card danger">
            <p class="metric-label">Pending Payment</p>
            <p class="metric-value">{pending_pay}</p>
        </div>""", unsafe_allow_html=True)
    with c6:
        st.markdown(f"""<div class="metric-card danger">
            <p class="metric-label">Overdue Follow-up</p>
            <p class="metric-value">{overdue}</p>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Revenue Metrics
    st.markdown('<p class="section-title">💰 Revenue Overview</p>', unsafe_allow_html=True)
    revenue = get_revenue_stats()
    r1, r2, r3 = st.columns(3)
    with r1:
        st.markdown(f"""<div class="metric-card success">
            <p class="metric-label">Total Earned</p>
            <p class="metric-value">₹{revenue['earned']:,.0f}</p>
        </div>""", unsafe_allow_html=True)
    with r2:
        st.markdown(f"""<div class="metric-card danger">
            <p class="metric-label">Pending Collection</p>
            <p class="metric-value">₹{revenue['pending']:,.0f}</p>
        </div>""", unsafe_allow_html=True)
    with r3:
        st.markdown(f"""<div class="metric-card">
            <p class="metric-label">Total Invoiced</p>
            <p class="metric-value">₹{revenue['total']:,.0f}</p>
        </div>""", unsafe_allow_html=True)

    monthly = get_monthly_revenue()
    if monthly:
        df_monthly          = pd.DataFrame(monthly, columns=["Month", "Earned"])
        df_monthly["Month"] = pd.to_datetime(df_monthly["Month"])
        fig_rev = px.bar(
            df_monthly, x="Month", y="Earned",
            color_discrete_sequence=["#4fcf70"], text="Earned"
        )
        fig_rev.update_layout(
            margin=dict(t=10, b=10, l=10, r=10),
            paper_bgcolor="white", plot_bgcolor="white", height=220,
            xaxis=dict(showgrid=False),
            yaxis=dict(showgrid=True, gridcolor="#f0f0f0", title="₹")
        )
        fig_rev.update_traces(texttemplate="₹%{text:,.0f}", textposition="outside")
        st.plotly_chart(fig_rev, use_container_width=True)
    else:
        st.caption("Open a client with 👁️ and set an invoice amount to see revenue chart")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Filters
    st.markdown('<p class="section-title">🔍 Filter Clients</p>', unsafe_allow_html=True)
    f1, f2, _ = st.columns([2, 2, 6])
    with f1:
        status_filter = st.selectbox(
            "Status", ["All", "in progress", "stalled", "completed"],
            key="status_filter"
        )
    with f2:
        payment_filter = st.selectbox(
            "Payment", ["All", "pending", "paid"],
            key="payment_filter"
        )

    df_clients, df_logs = get_dataframes(status_filter, payment_filter)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Client List
    st.markdown('<p class="section-title">👥 Clients</p>', unsafe_allow_html=True)

    if df_clients.empty:
        st.info("No clients yet. Add one from the sidebar or upload a CSV/Excel file.")
    else:
        for _, row in df_clients.iterrows():
            badge_class = {
                "in progress": "badge-progress",
                "stalled":     "badge-stalled",
                "completed":   "badge-complete"
            }.get(row["status"], "badge-progress")
            pay_icon = "🔴" if row["payment_status"] == "pending" else "🟢"

            with st.container():
                col_info, col_actions = st.columns([7, 3])

                with col_info:
                    st.markdown(f"""
                    <div class="client-card">
                        <strong>{row['name']}</strong>
                        <span class="badge {badge_class}" style="margin-left:8px">{row['status']}</span>
                        <br>
                        <small style="color:#6b7280">{row['project']}</small>
                        <span style="float:right;font-size:0.8rem">{pay_icon} {row['payment_status']} · {int(row['days_since_contact'])}d ago</span>
                    </div>
                    """, unsafe_allow_html=True)

                with col_actions:
                    ea, eb, ec, ed, ee = st.columns(5)
                    with ea:
                        if st.button("👁️", key=f"view_{row['id']}", help="View Details"):
                            st.session_state[f"viewing_{row['id']}"] = not st.session_state.get(f"viewing_{row['id']}", False)
                    with eb:
                        if st.button("✏️", key=f"edit_{row['id']}", help="Edit"):
                            st.session_state[f"editing_{row['id']}"] = True
                    with ec:
                        if st.button("📝", key=f"log_{row['id']}", help="Add Log"):
                            st.session_state[f"logging_{row['id']}"] = True
                    with ed:
                        if st.button("✉️", key=f"email_{row['id']}", help="Draft Email"):
                            st.session_state[f"emailing_{row['id']}"] = not st.session_state.get(f"emailing_{row['id']}", False)
                    with ee:
                        if st.button("🗑️", key=f"del_{row['id']}", help="Delete"):
                            st.session_state[f"confirm_del_{row['id']}"] = True

            # ── Client Detail View
            if st.session_state.get(f"viewing_{row['id']}"):
                with st.expander(f"👁️ {row['name']} — Full Details", expanded=True):
                    d1, d2 = st.columns(2)
                    with d1:
                        st.markdown(f"**Project:** {row['project']}")
                        st.markdown(f"**Status:** {row['status']}")
                        st.markdown(f"**Last Contact:** {str(row['last_contact'])[:10]}")
                    with d2:
                        st.markdown(f"**Payment:** {row['payment_status']}")
                        client_data = get_client_by_id(row["id"])
                        invoice_amt = client_data[6] if client_data and len(client_data) > 6 else 0
                        st.markdown(f"**Invoice Amount:** ₹{invoice_amt or 0:,.0f}")

                    st.markdown("---")
                    st.markdown("**Update Invoice Amount:**")
                    inv1, inv2 = st.columns([3, 1])
                    with inv1:
                        new_amount = st.number_input(
                            "Amount (₹)",
                            min_value=0.0,
                            value=float(invoice_amt or 0),
                            step=500.0,
                            key=f"inv_{row['id']}"
                        )
                    with inv2:
                        st.markdown("<br>", unsafe_allow_html=True)
                        if st.button("💾 Save", key=f"save_inv_{row['id']}"):
                            update_invoice_amount(row["id"], new_amount)
                            st.success("Saved!")
                            st.rerun()

                    st.markdown("---")
                    st.markdown("**Activity Log:**")
                    logs = get_logs_for_client(row["id"])
                    if logs:
                        for log in logs:
                            st.markdown(f"🕐 `{log[1]}` — {log[0]}")
                    else:
                        st.caption("No logs yet. Add one using 📝")

            # ── Edit Form
            if st.session_state.get(f"editing_{row['id']}"):
                with st.expander(f"✏️ Edit {row['name']}", expanded=True):
                    with st.form(key=f"edit_form_{row['id']}"):
                        e_name    = st.text_input("Name",    value=row["name"])
                        e_project = st.text_input("Project", value=row["project"])
                        e_status  = st.selectbox(
                            "Status",
                            ["in progress", "stalled", "completed"],
                            index=["in progress", "stalled", "completed"].index(row["status"])
                        )
                        e_payment = st.selectbox(
                            "Payment",
                            ["pending", "paid"],
                            index=["pending", "paid"].index(row["payment_status"])
                        )
                        e_contact = st.date_input(
                            "Last Contact",
                            value=pd.to_datetime(row["last_contact"]).date()
                        )
                        s1, s2 = st.columns(2)
                        with s1:
                            save = st.form_submit_button("💾 Save")
                        with s2:
                            cancel = st.form_submit_button("Cancel")

                        if save:
                            update_client(
                                row["id"], e_name, e_project,
                                e_status, str(e_contact), e_payment
                            )
                            st.session_state[f"editing_{row['id']}"] = False
                            st.rerun()
                        if cancel:
                            st.session_state[f"editing_{row['id']}"] = False
                            st.rerun()

            # ── Add Log Form
            if st.session_state.get(f"logging_{row['id']}"):
                with st.expander(f"📝 Add Log for {row['name']}", expanded=True):
                    existing_logs = get_logs_for_client(row["id"])
                    if existing_logs:
                        for log in existing_logs:
                            st.markdown(f"- `{log[1]}` — {log[0]}")
                        st.markdown("---")

                    with st.form(key=f"log_form_{row['id']}"):
                        log_note = st.text_area("Note")
                        log_date = st.date_input("Date", value=date.today())
                        l1, l2   = st.columns(2)
                        with l1:
                            log_save = st.form_submit_button("💾 Save Log")
                        with l2:
                            log_cancel = st.form_submit_button("Cancel")

                        if log_save and log_note:
                            add_log(row["id"], log_note, str(log_date))
                            st.session_state[f"logging_{row['id']}"] = False
                            st.rerun()
                        if log_cancel:
                            st.session_state[f"logging_{row['id']}"] = False
                            st.rerun()

            # ── Email Draft
            if st.session_state.get(f"emailing_{row['id']}"):
                with st.expander(f"✉️ Draft Email for {row['name']}", expanded=True):
                    st.caption("Just tell me what you want to say in plain English")
                    email_request = st.text_area(
                        "",
                        placeholder="e.g. remind him about the pending payment politely, or tell her the project is done and share the invoice",
                        key=f"email_req_{row['id']}"
                    )
                    g1, g2 = st.columns(2)
                    with g1:
                        generate = st.button("⚡ Generate Email", key=f"gen_email_{row['id']}")
                    with g2:
                        if st.button("Close", key=f"close_email_{row['id']}"):
                            st.session_state[f"emailing_{row['id']}"]    = False
                            st.session_state[f"email_draft_{row['id']}"] = None
                            st.rerun()

                    if generate and email_request:
                        logs        = get_logs_for_client(row["id"])
                        log_context = "\n".join([f"- {l[1]}: {l[0]}" for l in logs]) if logs else "No logs"
                        client_ctx  = f"Project: {row['project']}, Status: {row['status']}, Payment: {row['payment_status']}, Last contact: {str(row['last_contact'])[:10]}\nLogs:\n{log_context}"
                        with st.spinner("Writing email..."):
                            email_draft = draft_email_from_text(row["name"], email_request, client_ctx)
                        st.session_state[f"email_draft_{row['id']}"] = email_draft

                    if st.session_state.get(f"email_draft_{row['id']}"):
                        st.markdown("---")
                        st.text_area(
                            "Generated Email — select all and copy:",
                            value=st.session_state[f"email_draft_{row['id']}"],
                            height=280,
                            key=f"email_out_{row['id']}"
                        )
                        st.caption("✅ Copy and paste into your email client")

            # ── Delete Confirmation
            if st.session_state.get(f"confirm_del_{row['id']}"):
                st.warning(f"Delete **{row['name']}**? This cannot be undone.")
                d1, d2 = st.columns(2)
                with d1:
                    if st.button("Yes, Delete", key=f"yes_del_{row['id']}"):
                        delete_client(row["id"])
                        st.session_state[f"confirm_del_{row['id']}"] = False
                        st.rerun()
                with d2:
                    if st.button("Cancel", key=f"no_del_{row['id']}"):
                        st.session_state[f"confirm_del_{row['id']}"] = False
                        st.rerun()

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Charts
    col_left, col_right = st.columns(2)

    with col_left:
        st.markdown('<p class="section-title">Project Status Breakdown</p>', unsafe_allow_html=True)
        if not df_all.empty:
            status_counts         = df_all["status"].value_counts().reset_index()
            status_counts.columns = ["Status", "Count"]
            fig = px.pie(
                status_counts, values="Count", names="Status", color="Status",
                color_discrete_map={
                    "in progress": "#4f8ef7",
                    "stalled":     "#f7a94f",
                    "completed":   "#4fcf70"
                },
                hole=0.5
            )
            fig.update_layout(
                showlegend=True,
                margin=dict(t=10, b=10, l=10, r=10),
                paper_bgcolor="white", height=280
            )
            st.plotly_chart(fig, use_container_width=True)

    with col_right:
        st.markdown('<p class="section-title">Payment Overview</p>', unsafe_allow_html=True)
        if not df_all.empty:
            pay_counts         = df_all["payment_status"].value_counts().reset_index()
            pay_counts.columns = ["Payment", "Count"]
            fig2 = px.bar(
                pay_counts, x="Payment", y="Count", color="Payment",
                color_discrete_map={"pending": "#f74f4f", "paid": "#4fcf70"},
                text="Count"
            )
            fig2.update_layout(
                showlegend=False,
                margin=dict(t=10, b=10, l=10, r=10),
                paper_bgcolor="white", plot_bgcolor="white", height=280,
                xaxis=dict(showgrid=False),
                yaxis=dict(showgrid=True, gridcolor="#f0f0f0")
            )
            fig2.update_traces(textposition="outside")
            st.plotly_chart(fig2, use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown('<p class="section-title">Days Since Last Contact</p>', unsafe_allow_html=True)
        if not df_all.empty:
            fig3 = px.bar(
                df_all.sort_values("days_since_contact", ascending=True),
                x="days_since_contact", y="name", orientation="h",
                color="days_since_contact",
                color_continuous_scale=["#4fcf70", "#f7a94f", "#f74f4f"],
                text="days_since_contact"
            )
            fig3.update_layout(
                showlegend=False, coloraxis_showscale=False,
                margin=dict(t=10, b=10, l=10, r=10),
                paper_bgcolor="white", plot_bgcolor="white", height=300,
                xaxis=dict(showgrid=False, title="Days"),
                yaxis=dict(showgrid=False, title="")
            )
            fig3.update_traces(textposition="outside")
            st.plotly_chart(fig3, use_container_width=True)

    with col_b:
        st.markdown('<p class="section-title">Activity Timeline</p>', unsafe_allow_html=True)
        if not df_logs.empty and not df_all.empty:
            df_logs_named = df_logs.merge(
                df_all[["id", "name"]], left_on="client_id", right_on="id"
            )
            if not df_logs_named.empty:
                df_logs_named["date"] = pd.to_datetime(df_logs_named["date"])
                fig4 = px.scatter(
                    df_logs_named, x="date", y="name",
                    hover_data=["note"], color="name"
                )
                fig4.update_traces(marker=dict(size=12))
                fig4.update_layout(
                    showlegend=False,
                    margin=dict(t=10, b=10, l=10, r=10),
                    paper_bgcolor="white", plot_bgcolor="white", height=300,
                    xaxis=dict(showgrid=True, gridcolor="#f0f0f0"),
                    yaxis=dict(showgrid=False, title="")
                )
                st.plotly_chart(fig4, use_container_width=True)
        else:
            st.info("Add logs to clients to see activity timeline")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── File Upload
    st.markdown('<p class="section-title">📁 Upload Data</p>', unsafe_allow_html=True)
    dash_file = st.file_uploader(
        "Upload Excel, CSV, PDF, PPTX or TXT",
        type=["xlsx", "xls", "csv", "pdf", "pptx", "txt"],
        key="uploader_dashboard"
    )
    if dash_file is not None:
        if st.button("⚡ Process & Store File", key="process_dashboard"):
            with st.spinner("Reading and storing file..."):
                filetype, content, was_client_data, inserted = parse_file(dash_file)
                save_uploaded_file(dash_file.name, filetype, content)
            if was_client_data and inserted > 0:
                st.success(f"✅ {dash_file.name} processed — {inserted} clients added to dashboard!")
            else:
                st.success(f"✅ {dash_file.name} stored successfully")
            st.rerun()

    uploaded_files = get_uploaded_files()
    if uploaded_files:
        st.markdown("**Previously uploaded files:**")
        for f in uploaded_files:
            st.markdown(f"- 📄 `{f[0]}` · *{f[3][:10]}*")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── AI Briefing
    st.markdown('<p class="section-title">🧠 AI Daily Briefing</p>', unsafe_allow_html=True)
    if "briefing" not in st.session_state:
        with st.spinner("AI is analyzing your clients..."):
            st.session_state.briefing = get_daily_briefing()

    st.info(st.session_state.briefing)

    if st.button("🔄 Refresh Briefing"):
        with st.spinner("Re-analyzing..."):
            st.session_state.briefing = get_daily_briefing()
        st.rerun()

# ─── Chat ────────────────────────────────────
elif page == "💬 Chat":
    st.markdown("## 💬 Chat with your Brain")
    st.markdown("*Ask anything about your clients and projects.*")
    st.markdown("---")

    st.markdown('<p class="section-title">📁 Upload a File</p>', unsafe_allow_html=True)
    chat_file = st.file_uploader(
        "Upload Excel, CSV, PDF, PPTX or TXT",
        type=["xlsx", "xls", "csv", "pdf", "pptx", "txt"],
        key="uploader_chat"
    )
    if chat_file is not None:
        if st.button("⚡ Process & Store File", key="process_chat"):
            with st.spinner("Reading and storing file..."):
                filetype, content, was_client_data, inserted = parse_file(chat_file)
                save_uploaded_file(chat_file.name, filetype, content)
            if was_client_data and inserted > 0:
                st.success(f"✅ {chat_file.name} processed — {inserted} clients added! Ask me anything about them.")
            else:
                st.success(f"✅ {chat_file.name} stored — ask me anything about it!")
            st.rerun()

    uploaded_files = get_uploaded_files()
    if uploaded_files:
        st.markdown("**Stored files:**")
        for f in uploaded_files:
            st.markdown(f"- 📄 `{f[0]}` · *{f[3][:10]}*")

    st.markdown("---")

    if "messages" not in st.session_state:
        st.session_state.messages = get_last_messages(50)

    col1, col2 = st.columns([8, 1])
    with col2:
        if st.button("🗑️ Clear"):
            clear_chat_history()
            st.session_state.messages = []
            st.rerun()

    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    if prompt := st.chat_input("Ask your brain anything..."):
        save_message("user", prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                response = ask_brain(prompt, st.session_state.messages[:-1])
            st.markdown(response)

        save_message("assistant", response)
        st.session_state.messages.append({"role": "assistant", "content": response})