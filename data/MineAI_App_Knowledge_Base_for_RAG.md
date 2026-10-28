# MineAI — Complete Application Documentation & Knowledge Base

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
