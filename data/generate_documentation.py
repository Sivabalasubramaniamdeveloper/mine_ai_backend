#!/usr/bin/env python3
"""
MineAI Complete Documentation & PDF Knowledge Base Generator
Generates:
1. MineAI_Complete_App_Documentation_and_Knowledge_Base.pdf
2. MineAI_App_Knowledge_Base_for_RAG.md
3. MineAI_Flowise_Chatflow_Config.json
"""

import os
import re

class PDFDoc:
    def __init__(self, filename, title="MineAI Documentation"):
        self.filename = filename
        self.title = title
        self.pages = []
        self.current_page_stream = []
        self.page_width = 595.28
        self.page_height = 841.89
        self.margin_left = 50.0
        self.margin_right = 50.0
        self.margin_top = 55.0
        self.margin_bottom = 50.0
        self.content_width = self.page_width - self.margin_left - self.margin_right
        self.y = self.page_height - self.margin_top
        self.font_name = "F1"
        self.font_size = 10
        self.color = (0.1, 0.1, 0.1)
        self.new_page()

    def new_page(self):
        if self.current_page_stream:
            self.pages.append(self.current_page_stream)
        self.current_page_stream = []
        self.y = self.page_height - self.margin_top

    def check_space(self, needed):
        if self.y - needed < self.margin_bottom:
            self.new_page()

    def set_color(self, r, g, b):
        self.color = (r, g, b)
        self.current_page_stream.append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def draw_line(self, x1, y1, x2, y2, r=0.8, g=0.8, b=0.8, width=0.75):
        self.current_page_stream.append(f"{r:.3f} {g:.3f} {b:.3f} RG {width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def draw_rect(self, x, y, w, h, fill_r, fill_g, fill_b, stroke_r=None, stroke_g=None, stroke_b=None):
        if stroke_r is not None:
            self.current_page_stream.append(f"{stroke_r:.3f} {stroke_g:.3f} {stroke_b:.3f} RG 0.5 w")
        self.current_page_stream.append(f"{fill_r:.3f} {fill_g:.3f} {fill_b:.3f} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re {'B' if stroke_r is not None else 'f'}")

    def escape_text(self, text):
        return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    def wrap_text(self, text, max_chars):
        words = text.split(' ')
        lines = []
        cur_line = []
        cur_len = 0
        for w in words:
            if not w:
                continue
            if cur_len + len(w) + 1 > max_chars:
                lines.append(' '.join(cur_line))
                cur_line = [w]
                cur_len = len(w)
            else:
                cur_line.append(w)
                cur_len += len(w) + 1
        if cur_line:
            lines.append(' '.join(cur_line))
        return lines

    def add_doc_title(self, title, subtitle):
        self.check_space(110)
        # Background header box
        self.draw_rect(self.margin_left - 10, self.y - 75, self.content_width + 20, 85, 0.94, 0.96, 1.0, 0.2, 0.4, 0.8)
        
        # Title text
        self.set_color(0.08, 0.22, 0.55)
        esc_title = self.escape_text(title)
        self.current_page_stream.append(f"BT /F2 20 Tf {self.margin_left:.2f} {self.y - 30:.2f} Td ({esc_title}) Tj ET")
        
        # Subtitle text
        self.set_color(0.3, 0.35, 0.45)
        esc_sub = self.escape_text(subtitle)
        self.current_page_stream.append(f"BT /F3 10 Tf {self.margin_left:.2f} {self.y - 52:.2f} Td ({esc_sub}) Tj ET")
        
        # Version info
        self.set_color(0.2, 0.5, 0.3)
        self.current_page_stream.append(f"BT /F2 8 Tf {self.margin_left:.2f} {self.y - 68:.2f} Td (Version: 1.0.0 Production | Target: RAG Flowise AI Knowledge Base | Updated: October 2026) Tj ET")
        
        self.y -= 95

    def add_h1(self, text):
        self.check_space(45)
        self.y -= 10
        self.set_color(0.10, 0.25, 0.65)
        esc = self.escape_text(text)
        self.current_page_stream.append(f"BT /F2 14 Tf {self.margin_left:.2f} {self.y:.2f} Td ({esc}) Tj ET")
        self.draw_line(self.margin_left, self.y - 4, self.margin_left + self.content_width, self.y - 4, 0.2, 0.4, 0.8, 1.2)
        self.y -= 18

    def add_h2(self, text):
        self.check_space(32)
        self.y -= 6
        self.set_color(0.15, 0.35, 0.55)
        esc = self.escape_text(text)
        self.current_page_stream.append(f"BT /F2 11 Tf {self.margin_left:.2f} {self.y:.2f} Td ({esc}) Tj ET")
        self.draw_line(self.margin_left, self.y - 2, self.margin_left + 180, self.y - 2, 0.4, 0.6, 0.8, 0.6)
        self.y -= 14

    def add_h3(self, text):
        self.check_space(24)
        self.y -= 4
        self.set_color(0.2, 0.25, 0.35)
        esc = self.escape_text(text)
        self.current_page_stream.append(f"BT /F2 9.5 Tf {self.margin_left:.2f} {self.y:.2f} Td ({esc}) Tj ET")
        self.y -= 12

    def add_paragraph(self, text, indent=0):
        lines = self.wrap_text(text, max_chars=int(95 - indent * 0.15))
        for line in lines:
            self.check_space(14)
            self.set_color(0.2, 0.2, 0.2)
            esc = self.escape_text(line)
            self.current_page_stream.append(f"BT /F1 8.5 Tf {self.margin_left + indent:.2f} {self.y:.2f} Td ({esc}) Tj ET")
            self.y -= 11.5
        self.y -= 3

    def add_bullet(self, bold_prefix, text):
        full_text = f"{bold_prefix} {text}"
        lines = self.wrap_text(full_text, max_chars=88)
        self.check_space(len(lines) * 13 + 4)
        
        # Bullet symbol
        self.set_color(0.2, 0.4, 0.8)
        self.current_page_stream.append(f"BT /F2 10 Tf {self.margin_left + 6:.2f} {self.y:.2f} Td (-) Tj ET")
        
        # First line with prefix
        for i, line in enumerate(lines):
            self.check_space(13)
            self.set_color(0.2, 0.2, 0.2)
            esc = self.escape_text(line)
            font = "/F2" if i == 0 and len(bold_prefix) > 0 else "/F1"
            self.current_page_stream.append(f"BT {font} 8.5 Tf {self.margin_left + 16:.2f} {self.y:.2f} Td ({esc}) Tj ET")
            self.y -= 11.5
        self.y -= 2

    def add_key_value(self, key, value):
        self.check_space(14)
        self.set_color(0.15, 0.2, 0.3)
        esc_k = self.escape_text(key + ":")
        self.current_page_stream.append(f"BT /F2 8.5 Tf {self.margin_left + 10:.2f} {self.y:.2f} Td ({esc_k}) Tj ET")
        
        self.set_color(0.25, 0.25, 0.25)
        esc_v = self.escape_text(value)
        self.current_page_stream.append(f"BT /F1 8.5 Tf {self.margin_left + 150:.2f} {self.y:.2f} Td ({esc_v}) Tj ET")
        self.y -= 12

    def add_code_block(self, lines_of_code):
        box_height = len(lines_of_code) * 11 + 10
        self.check_space(box_height + 10)
        self.draw_rect(self.margin_left + 5, self.y - box_height + 8, self.content_width - 10, box_height, 0.96, 0.96, 0.97, 0.85, 0.85, 0.9)
        self.y -= 6
        for line in lines_of_code:
            self.set_color(0.15, 0.15, 0.25)
            esc = self.escape_text(line[:85])
            self.current_page_stream.append(f"BT /F4 7.5 Tf {self.margin_left + 12:.2f} {self.y:.2f} Td ({esc}) Tj ET")
            self.y -= 11
        self.y -= 6

    def compile(self):
        if self.current_page_stream:
            self.pages.append(self.current_page_stream)
        total_pages = len(self.pages)
        
        objects = []
        def add_obj(content):
            objects.append(content)
            return len(objects)

        # 1: Catalog
        catalog_id = 1
        pages_id = 2
        font_f1_id = 3
        font_f2_id = 4
        font_f3_id = 5
        font_f4_id = 6

        # Reserve page object IDs
        page_ids = []
        content_ids = []
        cur_id = 7
        for _ in range(total_pages):
            page_ids.append(cur_id)
            content_ids.append(cur_id + 1)
            cur_id += 2

        doc_bytes = bytearray()
        doc_bytes.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = {}

        def write_obj(num, body):
            offsets[num] = len(doc_bytes)
            doc_bytes.extend(f"{num} 0 obj\n{body}\nendobj\n".encode('latin1'))

        # Write catalog and pages
        write_obj(catalog_id, f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
        kids_str = " ".join([f"{pid} 0 R" for pid in page_ids])
        write_obj(pages_id, f"<< /Type /Pages /Kids [{kids_str}] /Count {total_pages} >>")

        # Fonts
        write_obj(font_f1_id, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        write_obj(font_f2_id, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        write_obj(font_f3_id, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>")
        write_obj(font_f4_id, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

        # Write pages and contents
        for idx, page_stream_ops in enumerate(self.pages):
            pid = page_ids[idx]
            cid = content_ids[idx]
            page_num = idx + 1

            # Header on pages > 1
            header_ops = ""
            if page_num > 1:
                header_ops = (
                    f"0.4 0.45 0.55 rg BT /F3 7.5 Tf {self.margin_left:.2f} {self.page_height - 35:.2f} Td "
                    f"(MineAI Complete Knowledge Base & Architecture Reference | Page {page_num} of {total_pages}) Tj ET "
                    f"0.85 0.85 0.85 RG 0.5 w {self.margin_left:.2f} {self.page_height - 39:.2f} m {self.page_width - self.margin_right:.2f} {self.page_height - 39:.2f} l S "
                )

            # Footer on all pages
            footer_ops = (
                f"0.85 0.85 0.85 RG 0.5 w {self.margin_left:.2f} {self.margin_bottom + 8:.2f} m {self.page_width - self.margin_right:.2f} {self.margin_bottom + 8:.2f} l S "
                f"0.5 0.5 0.5 rg BT /F1 7.5 Tf {self.margin_left:.2f} {self.margin_bottom - 2:.2f} Td "
                f"(MineAI Confidential & Proprietary - RAG Vector Database Document) Tj ET "
                f"BT /F2 7.5 Tf {self.page_width - self.margin_right - 55:.2f} {self.margin_bottom - 2:.2f} Td "
                f"(Page {page_num} of {total_pages}) Tj ET "
            )

            full_stream = (header_ops + " ".join(page_stream_ops) + " " + footer_ops).encode('latin1', 'replace')

            write_obj(pid, (
                f"<< /Type /Page /Parent {pages_id} 0 R "
                f"/MediaBox [0 0 {self.page_width:.2f} {self.page_height:.2f}] "
                f"/Contents {cid} 0 R "
                f"/Resources << /Font << /F1 {font_f1_id} 0 R /F2 {font_f2_id} 0 R /F3 {font_f3_id} 0 R /F4 {font_f4_id} 0 R >> >> >>"
            ))

            write_obj(cid, (
                f"<< /Length {len(full_stream)} >>\n"
                f"stream\n"
            ) + full_stream.decode('latin1') + "\nendstream")

        xref_pos = len(doc_bytes)
        total_objs = cur_id
        doc_bytes.extend(f"xref\n0 {total_objs}\n0000000000 65535 f \n".encode('latin1'))
        for num in range(1, total_objs):
            off = offsets.get(num, 0)
            doc_bytes.extend(f"{off:010d} 00000 n \n".encode('latin1'))

        doc_bytes.extend((
            f"trailer\n<< /Size {total_objs} /Root {catalog_id} 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode('latin1'))

        with open(self.filename, 'wb') as f:
            f.write(doc_bytes)
        print(f"Generated PDF with {total_pages} pages: {self.filename}")


def generate_all_knowledge_base():
    pdf_path_1 = "/Users/priyajayakumar/Documents/test_images/Backend/data/MineAI_Complete_App_Documentation_and_Knowledge_Base.pdf"
    pdf_path_2 = "/Users/priyajayakumar/Documents/test_images/flutter frontend/assets/docs/MineAI_Complete_App_Documentation.pdf"
    md_path_1 = "/Users/priyajayakumar/Documents/test_images/Backend/data/MineAI_App_Knowledge_Base_for_RAG.md"
    md_path_2 = "/Users/priyajayakumar/Documents/test_images/flutter frontend/assets/docs/MineAI_Complete_App_Knowledge_Base.md"
    flowise_json_path = "/Users/priyajayakumar/Documents/test_images/Backend/data/MineAI_Flowise_Chatflow_Config.json"

    pdf = PDFDoc(pdf_path_1, "MineAI Super-App Complete Documentation")
    
    # Title
    pdf.add_doc_title(
        "MineAI — All-in-One AI Productivity Hub",
        "Complete System Architecture, Feature Workflows, Database Schemas & RAG Knowledge Base"
    )

    # Section 1
    pdf.add_h1("1. Executive Summary & Application Overview")
    pdf.add_paragraph("MineAI is an enterprise-grade personal AI productivity super-app designed to unify daily digital workflows, multi-store smart shopping, localized information ingestion, secure credentials storage, and personal wellness into a single mobile experience.")
    pdf.add_bullet("Target Platforms:", "Native Android and iOS cross-platform mobile app built on Flutter 3.29+, complemented by an administrative Flutter web dashboard and a Node.js Express 5 microservice backend.")
    pdf.add_bullet("Core Philosophy:", "Privacy-first architecture with localized offline SQLite storage, biometric security, client-side encryption, and cloud synchronization powered by Supabase Auth and PostgreSQL.")
    pdf.add_bullet("AI Integration:", "Context-aware task extraction, automated professional email authoring, weather advisory insights, and integrated Flowise AI RAG chat assistance.")
    pdf.add_bullet("Accessibility & Localization:", "Clamped TextScaler.linear(1.0) preventing UI overflow across all system font scaling configurations, alongside full dual-language localization (English and Tamil).")

    # Section 2
    pdf.add_h1("2. System Architecture & Tech Stack")
    pdf.add_paragraph("The MineAI platform consists of three core codebases working collaboratively:")
    pdf.add_bullet("Flutter Frontend (Client App):", "Located in flutter frontend/. Built with BLoC/Cubit state management, GoRouter declarative routing, Dio HTTP client with Alice traffic inspector, and dynamic theme switching across 5 distinct visual palettes.")
    pdf.add_bullet("Node.js Backend (REST API):", "Located in Backend/. Express 5 microservice engine communicating with Supabase PostgreSQL, Google Generative AI (Gemini 2.5 Flash), Cheerio web scraping, Nodemailer SMTP transport, and Playwright headless automation.")
    pdf.add_bullet("Admin Portal:", "Located in admin/. Flutter Web/Desktop control center providing real-time system metrics, user tier audits, support ticket resolution, and OTT catalog curation.")

    pdf.add_h2("Technical Specifications Table")
    pdf.add_key_value("Frontend Framework", "Flutter 3.29+ / Dart 3.8+ (Clean Layered Architecture)")
    pdf.add_key_value("State Management", "flutter_bloc 9.1.1 & Cubit Patterns")
    pdf.add_key_value("Networking Client", "Dio 5.8.0 with interceptors & Alice inspector")
    pdf.add_key_value("Cloud Backend", "Node.js 18+, Express 5.2.1, ESM Architecture")
    pdf.add_key_value("Database & Auth", "Supabase PostgreSQL (Cloud) + SQLite (Local Device)")
    pdf.add_key_value("AI Model Engines", "Google Gemini 2.5 Flash via @google/genai & Flowise RAG")
    pdf.add_key_value("Encrypted Storage", "flutter_secure_storage + AES-256 for Vault credentials")
    pdf.add_key_value("Media & Streaming", "HLS adaptive video player (Auto, 720p, 480p, 360p)")

    # Section 3
    pdf.add_h1("3. Detailed Core Features & Workflows")

    pdf.add_h2("Feature 1: AI Voice & Speech Task Extraction")
    pdf.add_paragraph("Converts spoken audio or conversational voice notes into structured, scheduled tasks with automated field parsing.")
    pdf.add_bullet("Workflow:", "User records audio via speech_to_text. Audio transcript is submitted to POST /api/v1/tasks/extract. The Gemini LLM parses task title, description, category (Work, Personal, Urgent, Meeting), priority (Low, Medium, High), and due dates/times.")
    pdf.add_bullet("Storage & Alarms:", "Parsed tasks are saved into local SQLite database. Local notifications are scheduled via flutter_local_notifications at the configured alarm timestamp.")
    pdf.add_bullet("Offline Resilience:", "If offline or if AI token quota is exceeded, voice audio transcription can be saved directly as a raw task draft without LLM parsing.")

    pdf.add_h2("Feature 2: Curated City News Web Scraper")
    pdf.add_paragraph("Delivers verified, localized daily news feeds extracted directly from national publishers with zero algorithmic sensationalism.")
    pdf.add_bullet("Data Sources:", "Live RSS feeds from The Hindu and Times of India, coupled with Cheerio web scraping for high-definition editorial photography.")
    pdf.add_bullet("Boundary Filtering:", "Strict city boundaries enforcing content relevance for Chennai, Bengaluru, Mumbai, Delhi, Hyderabad, Kolkata, Coimbatore, and Madurai.")
    pdf.add_bullet("Features:", "Publisher filter chips, article summaries, direct in-app browser article viewer, and native system share sheet integration.")

    pdf.add_h2("Feature 3: Real-Time Multi-Store Price Comparison")
    pdf.add_paragraph("Automates product price intelligence across major Indian e-commerce marketplaces to guarantee users get the lowest price.")
    pdf.add_bullet("Marketplaces Scraped:", "Amazon India, Flipkart, and Meesho.")
    pdf.add_bullet("Engine:", "Backend runs parallel scraping via multiStoreScraper.service.js. Normalizes prices, stock status, star ratings, and store logos.")
    pdf.add_bullet("Deal Detection:", "Calculates percentage savings between the highest and lowest price. Highlights 'Best Value' badges and provides direct store deep links.")
    pdf.add_bullet("Saved Deals:", "Allows bookmarking products into Supabase saved_deals table for ongoing price drop tracking.")

    pdf.add_h2("Feature 4: AI Email Assistant & Direct SMTP Dispatch")
    pdf.add_paragraph("An automated communications suite for drafting, polishing, and dispatching high-impact emails.")
    pdf.add_bullet("Generation Modes:", "Accepts topic or bullet points and generates emails across 4 tones: Professional, Casual, Friendly, and Urgent.")
    pdf.add_bullet("Direct Dispatch:", "Users can link custom Gmail App Passwords or standard SMTP credentials to send generated emails immediately from the app without leaving MineAI.")
    pdf.add_bullet("Cloud Templates:", "Save generated emails under custom labels and folders in Supabase email_templates.")

    pdf.add_h2("Feature 5: Encrypted Private Vault")
    pdf.add_paragraph("A hardened, zero-knowledge biometric safe for storing sensitive credentials and confidential records.")
    pdf.add_bullet("Security Model:", "Protected by biometric fingerprint/FaceID authentication via local_auth. Credential secrets are encrypted client-side using AES-256 and stored in flutter_secure_storage.")
    pdf.add_bullet("Item Types:", "Website logins, credit/debit card numbers, Wi-Fi keys, secure notes, bank account identifiers, and confidential documents.")
    pdf.add_bullet("Privacy:", "Vault items never transmit plaintext credentials to cloud servers; secrets remain exclusively on the user device.")

    pdf.add_h2("Feature 6: Personal Diary & Mood Celebrator")
    pdf.add_paragraph("A daily reflective journaling system combining multimedia memory logs with mood wellness tracking.")
    pdf.add_bullet("Features:", "Supports rich text notes, audio voice memo recordings, and gallery photos. Tracks daily emotional mood scores (1 to 5 stars).")
    pdf.add_bullet("Mood Poster:", "Renders an artistic 'Mood Vibe' poster snapshot ready for instant export and social media sharing.")
    pdf.add_bullet("Storage:", "Entries are stored in SQLite diary_entries with optional cloud sync to Supabase.")

    pdf.add_h2("Feature 7: Expense & Budget Tracker")
    pdf.add_paragraph("Comprehensive personal finance manager with visual spend distribution and financial statements.")
    pdf.add_bullet("Features:", "Logs income and expenses with customizable categories (Food, Bills, Travel, Shopping, Health). Visual budget progress bar warns of limit overruns.")
    pdf.add_bullet("Reporting & Export:", "Generates itemized financial reports with direct one-tap export to Excel (.xlsx) and printable PDF statements via the native pdf library.")

    pdf.add_h2("Feature 8: MineAI Streams (OTT Video Hub)")
    pdf.add_paragraph("A curated media streaming player supporting modern HLS (HTTP Live Streaming) adaptive bitrate playback.")
    pdf.add_bullet("Playback Controls:", "Multi-quality switcher (Auto, 720p, 480p, 360p), playback speed from 0.5x to 2.0x, aspect ratio toggles, and swipe gesture controls for volume and brightness.")

    pdf.add_h2("Feature 9: Weather Insights & AI Recommendations")
    pdf.add_paragraph("Real-time meteorological forecasts coupled with intelligent daily lifestyle recommendations.")
    pdf.add_bullet("Data Provided:", "Temperature, humidity, UV index, wind speed, and precipitation chance.")
    pdf.add_bullet("AI Advice:", "Gemini generates personalized contextual advice (e.g. workout suitability, umbrella reminders, optimal commute times).")

    pdf.add_h2("Feature 10: BYOK Custom API Key Management")
    pdf.add_paragraph("Empowers advanced users to connect their personal Google Gemini or OpenAI API keys.")
    pdf.add_bullet("Benefit:", "Bypasses default free tier monthly token quotas with zero rate limits. Stored securely with asymmetric encryption.")

    pdf.add_h2("Feature 11: Support Ticket Helpdesk")
    pdf.add_paragraph("Integrated customer care portal allowing users to raise support inquiries directly within the app.")
    pdf.add_bullet("Statuses:", "Open -> In Progress -> Resolved -> Closed. Synchronized in real time with the Flutter Admin dashboard.")

    pdf.add_h2("Feature 12: Dynamic Theming & Localization")
    pdf.add_paragraph("User-customizable look-and-feel designed for all lighting conditions and multilingual users.")
    pdf.add_bullet("Color Modes:", "Deep Dark, Pure Light, Natural, Orange, and White-Blue.")
    pdf.add_bullet("Languages:", "Full English (en) and Tamil (ta) localization powered by easy_localization.")

    # Section 4: Database Schemas
    pdf.add_h1("4. Database Architecture & Schemas")
    pdf.add_paragraph("MineAI uses a hybrid storage model: Supabase PostgreSQL for cloud sync and user management, alongside local SQLite databases for instant offline access.")

    pdf.add_h2("Supabase PostgreSQL Tables")
    pdf.add_bullet("profile:", "id (UUID PK), full_name, email, avatar_url, plan_id (free/pro/premium), token_balance, theme_mode, language, created_at, updated_at.")
    pdf.add_bullet("user_keys:", "id (UUID PK), user_id (FK), provider (gemini/openai), encrypted_key, is_active, created_at.")
    pdf.add_bullet("tickets:", "id (UUID PK), user_id (FK), subject, description, priority (low/medium/high/urgent), status (open/in_progress/resolved/closed), admin_notes, created_at.")
    pdf.add_bullet("email_templates:", "id (UUID PK), user_id (FK), title, subject, body, tone, label, created_at.")
    pdf.add_bullet("saved_deals:", "id (UUID PK), user_id (FK), product_title, store_name, price, original_price, product_url, image_url, created_at.")

    pdf.add_h2("Local SQLite Tables (Client Device)")
    pdf.add_bullet("tasks:", "id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, category TEXT, priority TEXT, due_date TEXT, due_time TEXT, is_completed INTEGER, alarm_enabled INTEGER.")
    pdf.add_bullet("expenses:", "id TEXT PRIMARY KEY, user_id TEXT, title TEXT, amount REAL, type TEXT (income/expense), category TEXT, date TEXT, payment_method TEXT, notes TEXT.")
    pdf.add_bullet("budgets:", "id TEXT PRIMARY KEY, user_id TEXT, category TEXT, monthly_limit REAL, month_year TEXT.")
    pdf.add_bullet("diary_entries:", "id TEXT PRIMARY KEY, user_id TEXT, title TEXT, content TEXT, mood_score INTEGER, photo_path TEXT, audio_path TEXT, created_at TEXT.")

    # Section 5: REST API Reference
    pdf.add_h1("5. Backend REST API Reference")
    pdf.add_paragraph("All endpoints are prefixed with /api/v1 and require an Authorization: Bearer <Supabase_JWT> header unless designated public.")
    
    pdf.add_h2("Core Endpoints Listing")
    pdf.add_bullet("POST /api/v1/auth/signup:", "Create new account with email & password.")
    pdf.add_bullet("POST /api/v1/auth/login:", "Authenticate user and return JWT session token.")
    pdf.add_bullet("GET /api/v1/user/me:", "Retrieve user profile, active plan tier, and token quota.")
    pdf.add_bullet("PUT /api/v1/user/profile:", "Update full name, avatar, and app preferences.")
    pdf.add_bullet("POST /api/v1/tasks/extract:", "Accepts audio transcription text; returns parsed task JSON.")
    pdf.add_bullet("GET /api/v1/prices/search?q=<query>:", "Multi-store scraper querying Amazon, Flipkart, Meesho.")
    pdf.add_bullet("POST /api/v1/email-helper/generate:", "Generates email copy with requested tone and length.")
    pdf.add_bullet("POST /api/v1/email-helper/send:", "Dispatches email via user-configured SMTP/Gmail.")
    pdf.add_bullet("GET /api/v1/news/feed?city=<city>:", "Fetches city-filtered news articles with editorial photos.")
    pdf.add_bullet("GET /api/v1/weather/current?city=<city>:", "Fetches live weather and Gemini health advice.")
    pdf.add_bullet("POST /api/v1/tickets:", "Submits support ticket with priority and description.")
    pdf.add_bullet("POST /api/v1/users/api-keys:", "Stores encrypted custom Gemini/OpenAI API key.")

    # Section 6: Flowise AI Implementation
    pdf.add_h1("6. Flowise AI RAG Implementation Guide")
    pdf.add_paragraph("To build the RAG (Retrieval-Augmented Generation) chatbot for MineAI, follow this exact architecture inside Flowise AI:")
    
    pdf.add_h2("Step 1: Install & Start Flowise")
    pdf.add_paragraph("Install Flowise globally or run it via npx / Docker:")
    pdf.add_code_block([
        "# Option A: Using NPX directly",
        "npx flowise start",
        "",
        "# Option B: Using Global NPM Install",
        "npm install -g flowise",
        "flowise start --PORT 3000",
        "",
        "# Flowise UI will open at: http://localhost:3000"
    ])

    pdf.add_h2("Step 2: Flowise Chatflow Canvas Architecture")
    pdf.add_paragraph("Create a new Chatflow named 'MineAI Assistant' and drag these nodes onto the canvas:")
    pdf.add_bullet("1. Document Loader Node:", "Select 'PDF File Loader'. Upload this generated MineAI Documentation PDF.")
    pdf.add_bullet("2. Text Splitter Node:", "Select 'Recursive Character Text Splitter'. Configure Chunk Size = 1000, Chunk Overlap = 200, Separators = ['\\n\\n', '\\n', ' ', '']. Connect output to Document Loader's Text Splitter input.")
    pdf.add_bullet("3. Embeddings Node:", "Select 'Google GenerativeAI Embeddings' (Model: text-embedding-004) or 'OpenAI Embeddings' (Model: text-embedding-3-small). Enter your API Key.")
    pdf.add_bullet("4. Vector Store Node:", "Select 'In-Memory Vector Store' (for local testing) or 'Supabase Vector Store' (production). Connect Document Loader to Vector Store's Document input, and Embeddings to Vector Store's Embeddings input.")
    pdf.add_bullet("5. Chat Model Node:", "Select 'ChatGoogleGenerativeAI' (Model: gemini-1.5-flash) or 'ChatOpenAI' (Model: gpt-4o-mini). Set Temperature = 0.2 for precise, factual answers.")
    pdf.add_bullet("6. Memory Node:", "Select 'Buffer Memory' or 'Conversation Summary Memory'. Set Session ID key = sessionId.")
    pdf.add_bullet("7. Retrieval QA Chain Node:", "Select 'Conversational Retrieval QA Chain'. Connect Chat Model, Vector Store (as Retriever), and Memory. Save and Deploy!")

    pdf.add_h2("Step 3: System Prompt Configuration")
    pdf.add_paragraph("Insert this prompt into the Chatflow System Prompt parameter:")
    pdf.add_code_block([
        "You are the official MineAI AI Assistant. You assist users with all questions",
        "about the MineAI mobile application, its features, workflows, and settings.",
        "Always base your responses on the retrieved MineAI documentation context.",
        "Be friendly, polite, concise, and format answers using Markdown bullet points.",
        "If a user asks about an unsupported feature, guide them to contact Support Tickets."
    ])

    pdf.add_h2("Step 4: Flowise REST API Integration")
    pdf.add_paragraph("Flowise exposes a prediction endpoint that the Flutter app queries:")
    pdf.add_code_block([
        "POST http://localhost:3000/api/v1/prediction/<YOUR_CHATFLOW_ID>",
        "Content-Type: application/json",
        "",
        "{",
        "  \"question\": \"How do I compare prices between Amazon and Flipkart?\",",
        "  \"chatId\": \"unique-user-session-id\",",
        "  \"streaming\": false",
        "}"
    ])

    # Section 7: FAQs
    pdf.add_h1("7. Comprehensive FAQs & Knowledge Base Q&A")
    pdf.add_paragraph("These verified Q&A pairs are indexed into vector embeddings for instant RAG lookup:")

    faqs = [
        ("Q: How does Voice Task Extraction work in MineAI?",
         "A: Go to Voice Tasks on the Home screen, tap the microphone button, and speak your thoughts naturally (e.g., 'Schedule meeting with Rahul tomorrow at 3 PM'). MineAI uses speech recognition and Gemini AI to automatically parse the title, date, time, priority, and category, then saves it to your local task list with notification reminders."),
        
        ("Q: Which stores are supported in Real-Time Price Comparison?",
         "A: MineAI searches and compares prices in real time across Amazon India, Flipkart, and Meesho. It displays ratings, stock status, and calculates exact price differences to highlight the best deal."),
        
        ("Q: Is my data in the Private Vault encrypted?",
         "A: Yes. All passwords, bank details, and notes in the Secure Vault are encrypted client-side using industry-standard AES-256 encryption and stored in hardware-backed secure storage. Biometric authentication (fingerprint/FaceID) is mandatory to unlock."),
        
        ("Q: How do I send emails using the AI Email Helper?",
         "A: Navigate to AI Email Helper, enter a quick prompt or bullet points, and choose a tone (Professional, Casual, Friendly, Urgent). Once generated, you can edit it and send it directly via your linked Gmail App Password or SMTP account, or save it as a template."),
        
        ("Q: Which cities are supported in Local City News?",
         "A: MineAI currently provides localized RSS feeds and editorial photos for 8 major Indian metropolitan cities: Chennai, Bengaluru, Mumbai, Delhi, Hyderabad, Kolkata, Coimbatore, and Madurai."),
        
        ("Q: Can I export my expense tracking reports?",
         "A: Yes. In the Expense Tracker screen, tap the Export button to export itemized monthly transaction reports directly into Excel (.xlsx) spreadsheets or printable PDF statements."),
        
        ("Q: What should I do if I run out of free AI tokens?",
         "A: You can either upgrade to a Pro plan in the Subscription screen, or go to Settings -> API Keys and enter your personal Google Gemini or OpenAI API key (BYOK) for unlimited zero-cost generation."),
        
        ("Q: How do I change the app theme and language?",
         "A: Open Settings from the Profile tab. Under Appearance, select from 5 themes (Deep Dark, Pure Light, Natural, Orange, White-Blue). Under Language, toggle between English and Tamil.")
    ]

    for q, a in faqs:
        pdf.add_bullet(q, a)

    pdf.compile()

    # Copy to Flutter assets
    with open(pdf_path_1, 'rb') as src, open(pdf_path_2, 'wb') as dst:
        dst.write(src.read())
    print(f"Copied PDF to Flutter Assets: {pdf_path_2}")

    # Generate Markdown documentation
    md_content = """# MineAI — Complete Application Documentation & Knowledge Base

> **Version**: 1.0.0 (Production Release)  
> **Platform**: Flutter (Android & iOS), Node.js Express Backend, Supabase PostgreSQL, SQLite  
> **Purpose**: Source Knowledge Base for Flowise AI RAG Vector Embeddings  

---

## 1. Executive Summary & Overview
MineAI is an all-in-one personal AI productivity super-app designed to streamline modern digital life. It unifies:
- **AI Voice & Speech Task Extraction**: Automatic entity recognition from spoken voice notes.
- **Curated City News Scraper**: Strict boundary-filtered news for 8 major Indian cities with editorial photography.
- **Multi-Store Price Comparison**: Real-time parallel scraper for Amazon, Flipkart, and Meesho with deal savings calculation.
- **AI Email Assistant**: Intelligent draft generator with tone controls and direct SMTP dispatch.
- **Encrypted Private Vault**: Biometric-protected AES-256 local safe for passwords and confidential notes.
- **Personal Diary & Mood Celebrator**: Multimedia journal with mood scoring and dynamic poster generator.
- **Expense & Budget Tracker**: Expense categorization, monthly spending thresholds, and Excel (.xlsx) / PDF report export.
- **MineAI Streams**: Curated OTT video player with adaptive HLS multi-bitrate streaming.
- **Weather Insights**: Real-time forecast with AI lifestyle advisory.
- **Custom API Key Management (BYOK)**: Connect personal Gemini/OpenAI API keys for zero token limits.
- **Support Ticket Helpdesk**: In-app ticketing system synced with admin dashboard.
- **Dynamic Theming & Localization**: 5 distinct themes and dual English/Tamil language support.

---

## 2. Technology Stack & Architecture

### Client App (`flutter frontend/`)
- **Framework**: Flutter 3.29+ / Dart 3.8+
- **Architecture**: BLoC / Cubit Pattern + Clean Architecture
- **Routing**: `go_router` with custom transitions
- **Networking**: `dio` 5.8+ with Alice HTTP Inspector & Pretty Dio Logger
- **Local Storage**: SQLite (`sqflite`), `flutter_secure_storage`
- **Security**: `local_auth` biometric authentication
- **Typography Fix**: Clamped `TextScaler.linear(1.0)` guaranteeing zero UI layout overflows across all system font size settings.

### Server Microservice (`Backend/`)
- **Runtime**: Node.js 18+, Express 5.2.1 (ESM)
- **Database & Auth**: Supabase PostgreSQL & Supabase Auth JWT
- **Scraping Engine**: Cheerio, Axios, Playwright
- **AI Engine**: Google Generative AI SDK (`@google/genai`) Gemini 2.5 Flash
- **Mail Transport**: Nodemailer with SMTP and Gmail App Passwords

### Admin Dashboard (`admin/`)
- **Framework**: Flutter Web / Desktop
- **Features**: User plan management, ticket resolutions, system health, OTT video catalog management.

---

## 3. Comprehensive Feature Reference & Workflows

### Feature 1: AI Voice & Speech Task Extraction
- **Screen**: `VoiceTasksScreen` (`/voice-tasks`)
- **Process**: User taps microphone, speech is transcribed locally via `speech_to_text`. Text is sent to `POST /api/v1/tasks/extract`.
- **Parsing Output**: Title, description, category (Work, Personal, Urgent, Meeting), priority (Low, Medium, High), due_date, due_time.
- **Storage**: Saved into local SQLite `tasks` table. Notification alarm scheduled via `flutter_local_notifications`.

### Feature 2: Curated City News Web Scraper
- **Screen**: `NewsScreen` (`/news`)
- **Cities Supported**: Chennai, Bengaluru, Mumbai, Delhi, Hyderabad, Kolkata, Coimbatore, Madurai.
- **Sources**: The Hindu and Times of India RSS feeds with Cheerio editorial photo scraping.
- **Features**: Publisher filter chips, article summaries, in-app web browser, native sharing.

### Feature 3: Real-Time Multi-Store Price Comparison
- **Screen**: `ComparePricesScreen` (`/compare-prices`)
- **Stores**: Amazon, Flipkart, Meesho.
- **Scraping**: Parallel scraping with real-time price normalization, stock check, rating parsing, and savings calculation.
- **Saved Deals**: Stored in Supabase `saved_deals` table.

### Feature 4: AI Email Assistant
- **Screen**: `EmailHelperScreen` (`/email-helper`)
- **Tones**: Professional, Casual, Friendly, Urgent.
- **Dispatch**: Direct email delivery using linked Gmail App Passwords or custom SMTP credentials without leaving the app.

### Feature 5: Encrypted Private Vault
- **Screen**: `VaultScreen` (`/vault`)
- **Protection**: Biometric fingerprint / FaceID lock.
- **Encryption**: Client-side AES-256 with `flutter_secure_storage`. Plaintext credentials never hit remote servers.

### Feature 6: Personal Diary & Mood Celebrator
- **Screen**: `DiaryDashboardScreen`
- **Features**: Rich text, voice memos, photo attachments, 1-5 star mood rating, dynamic 'Mood Vibe' poster generation.

### Feature 7: Expense & Budget Tracker
- **Screen**: `ExpenseTrackerScreen`
- **Features**: Income vs expense tracking, category budgets, visual limit warnings, Excel (.xlsx) and PDF export.

### Feature 8: MineAI Streams (OTT Video Hub)
- **Screen**: `OttScreen` (`/ott`)
- **Capabilities**: HLS adaptive multi-bitrate streaming (Auto, 720p, 480p, 360p), playback speed (0.5x to 2.0x), aspect ratio toggling.

### Feature 9: Weather Insights & AI Recommendations
- **Screen**: `WeatherScreen` (`/weather`)
- **Capabilities**: Temperature, humidity, wind, rainfall, UV index, and Gemini lifestyle advisory.

### Feature 10: BYOK Custom API Key Management
- **Screen**: `ApiKeysScreen` (`/api-keys`)
- **Providers**: Google Gemini and OpenAI personal API keys for unlimited zero-quota AI generation.

---

## 4. Backend REST API Endpoints
- `POST /api/v1/auth/signup` - Register user with email and password
- `POST /api/v1/auth/login` - Authenticate user and return JWT
- `GET /api/v1/user/me` - Fetch profile, plan, and token balance
- `PUT /api/v1/user/profile` - Update user profile information
- `POST /api/v1/tasks/extract` - Extract structured task from voice transcription
- `GET /api/v1/prices/search?q=<query>` - Scrape Amazon, Flipkart, Meesho
- `POST /api/v1/email-helper/generate` - Generate AI email draft
- `POST /api/v1/email-helper/send` - Send email via SMTP
- `GET /api/v1/news/feed?city=<city>` - Fetch city-filtered news articles
- `GET /api/v1/weather/current?city=<city>` - Real-time weather and AI advisory
- `POST /api/v1/tickets` - Create support ticket
- `POST /api/v1/users/api-keys` - Store custom Gemini / OpenAI API key

---

## 5. Flowise AI RAG Implementation Guide
1. **Install Flowise**: `npx flowise start` (port 3000)
2. **Create Chatflow**: Add PDF File Loader (upload `MineAI_Complete_App_Documentation.pdf`).
3. **Connect Text Splitter**: Recursive Character Text Splitter (chunkSize: 1000, chunkOverlap: 200).
4. **Connect Vector Store**: Supabase Vector Store or In-Memory Vector Store.
5. **Connect Embeddings**: Google Generative AI Embeddings (`text-embedding-004`) or OpenAI (`text-embedding-3-small`).
6. **Connect Chat Model**: ChatGoogleGenerativeAI (`gemini-1.5-flash`) or ChatOpenAI (`gpt-4o-mini`).
7. **Connect Memory**: Buffer Memory with `sessionId`.
8. **Connect Chain**: Conversational Retrieval QA Chain.
9. **API Endpoint**: `POST http://localhost:3000/api/v1/prediction/<chatflow-id>`
"""

    with open(md_path_1, 'w', encoding='utf-8') as f:
        f.write(md_content)
    with open(md_path_2, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Generated Markdown knowledge base at {md_path_1} and {md_path_2}")

    # Flowise configuration JSON
    flowise_config = {
        "chatflow": {
            "name": "MineAI Official Assistant",
            "description": "RAG AI Assistant powered by MineAI comprehensive knowledge base",
            "nodes": [
                {
                    "name": "pdfFile",
                    "label": "PDF File Loader",
                    "inputs": {
                        "pdfFile": "MineAI_Complete_App_Documentation.pdf",
                        "usage": "MineAI App Documentation & Specs"
                    }
                },
                {
                    "name": "recursiveCharacterTextSplitter",
                    "label": "Recursive Character Text Splitter",
                    "inputs": {
                        "chunkSize": 1000,
                        "chunkOverlap": 200,
                        "separators": ["\\n\\n", "\\n", " ", ""]
                    }
                },
                {
                    "name": "googleGenerativeAIEmbeddings",
                    "label": "Google Generative AI Embeddings",
                    "inputs": {
                        "modelName": "text-embedding-004"
                    }
                },
                {
                    "name": "memoryVectorStore",
                    "label": "In-Memory / Supabase Vector Store",
                    "inputs": {
                        "topK": 4
                    }
                },
                {
                    "name": "chatGoogleGenerativeAI",
                    "label": "ChatGoogleGenerativeAI",
                    "inputs": {
                        "modelName": "gemini-1.5-flash",
                        "temperature": 0.2
                    }
                },
                {
                    "name": "bufferMemory",
                    "label": "Buffer Memory",
                    "inputs": {
                        "memoryKey": "chat_history"
                    }
                },
                {
                    "name": "conversationalRetrievalQAChain",
                    "label": "Conversational Retrieval QA Chain",
                    "inputs": {
                        "systemMessage": "You are the official MineAI AI Assistant. Answer all user questions using the retrieved documentation context."
                    }
                }
            ],
            "apiEndpoint": "http://localhost:3000/api/v1/prediction/<CHATFLOW_ID>",
            "sampleRequest": {
                "question": "How do I use Voice Tasks in MineAI?",
                "chatId": "session-123"
            }
        }
    }

    import json
    with open(flowise_json_path, 'w', encoding='utf-8') as f:
        json.dump(flowise_config, f, indent=2)
    print(f"Generated Flowise Chatflow Configuration at {flowise_json_path}")


if __name__ == "__main__":
    generate_all_knowledge_base()
