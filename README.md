# WhatsApp AI Chatbot & Knowledge Base API — Guard Information System (GIS)

Sistem AI Chatbot WhatsApp internal untuk mendukung operasional dan SOP pengguna **Guard Information System (GIS)** pada PT Alumada Artha Prima.

## Arsitektur Sistem

```text
[WhatsApp User]
      │
      ▼
[Caddy Reverse Proxy (Auto HTTPS/SSL)]
      ├──► [WAHA (NOWEB Engine)] ──(Internal Docker Webhook)──► [n8n AI Agent]
      │                                                               │
      │                                                    (HTTP Request Tool)
      │                                                               ▼
      └──► [Express.js REST API + Swagger UI] ◄───────────────────────┘
                    │
                    ▼
          [PostgreSQL (Supabase)]
```
