---
summary: "Workspace template for TOOLS.md"
read_when:
  - Bootstrapping a workspace manually
---

# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Email (AgentMail.io)

- **Meine Email:** vica@agentmail.to
- **API Key:** `am_us_a21a0457f4bca43b8fef693462b55da925699c40451e8f55c8fff55523e16598`
- **API Endpoint:** `https://api.agentmail.to/v0`
- **Inbox ID:** `vica@agentmail.to`

### Email senden
```bash
curl -X POST "https://api.agentmail.to/v0/inboxes/vica@agentmail.to/messages/send" \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"to": "empfänger@example.com", "subject": "Betreff", "html": "<p>Inhalt</p>"}'
```

### Emails abrufen
```bash
curl "https://api.agentmail.to/v0/inboxes/vica@agentmail.to/messages" \
  -H "Authorization: Bearer <API_KEY>"
```

### Thread löschen
```bash
curl -X DELETE "https://api.agentmail.to/v0/inboxes/vica@agentmail.to/threads/<thread_id>" \
  -H "Authorization: Bearer <API_KEY>"
```

---

Add whatever helps you do your job. This is your cheat sheet.

## Dropbox (Datei-Ablage)
- **Account:** Daniel Vollmer (vollda@proton.me)
- **Token:** In .secrets gespeichert

### Dropbox-Befehle

```bash
# Ordner auflisten
curl -X POST https://api.dropboxapi.com/2/files/list_folder \
  -H "Authorization: Bearer $DROPBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path": ""}'

# Datei hochladen
curl -X POST https://content.dropboxapi.com/2/files/upload \
  -H "Authorization: Bearer $DROPBOX_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  -H "Dropbox-API-Arg: {\"path\": \"/datei.txt\",\"mode\":\"add\",\"autorename\":true}" \
  --data-binary @datei.txt

# Datei herunterladen
curl -X POST https://content.dropboxapi.com/2/files/download \
  -H "Authorization: Bearer $DROPBOX_TOKEN" \
  -H "Dropbox-API-Arg: {\"path\": \"/datei.txt\"}" \
  -o datei.txt
```

---

## Hostinger FTP (Steinegger IT)
- **Host:** `82.198.229.113`
- **User:** `u398194450`
- **Pass:** `MQYztYZan82s68pdUFQ%`
- **Pfad:** `/public_html/steinegger-it/` (oder `/public_html/` für Hauptdomain)

### FTP Befehle mit curl

```bash
# Datei hochladen
curl -T datei.html "ftp://82.198.229.113/public_html/steinegger-it/datei.html" --user u398194450:MQYztYZan82s68pdUFQ%

# Datei herunterladen
curl "ftp://82.198.229.113/public_html/steinegger-it/datei.html" --user u398194450:MQYztYZan82s68pdUFQ% -o datei.html

# Ordner auflisten
curl "ftp://82.198.229.113/public_html/steinegger-it/" --user u398194450:MQYztYZan82s68pdUFQ%
```

---

## 🎙️ TTS (Text-to-Speech) – edge-tts

**Standard-Stimme für Daniel:** `de-DE-FlorianMultilingualNeural` (Florian)

### Verfügbare deutsche Stimmen:
**Männer:**
- `de-DE-ConradNeural` – Freundlich, positiv
- `de-DE-FlorianMultilingualNeural` – Multilingual, freundlich ✅ **DANIEL'S WAHL**
- `de-DE-KillianNeural` – Modern, freundlich

**Frauen:**
- `de-DE-AmalaNeural` – Freundlich, positiv
- `de-DE-KatjaNeural` – Freundlich, positiv
- `de-DE-SeraphinaMultilingualNeural` – Multilingual, freundlich

### Installation:
```bash
pip install edge-tts --break-system-packages
```

### Verwendung:
```bash
# Sprachnachricht generieren
edge-tts --text "Dein Text hier" --voice de-DE-FlorianMultilingualNeural --write-media output.mp3

# Alle Stimmen auflisten
edge-tts --list-voices | grep "de-DE"
```

### Beispiel-Code (Python):
```python
import asyncio
import edge_tts

async def generate_speech(text, output_file, voice="de-DE-FlorianMultilingualNeural"):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

asyncio.run(generate_speech("Hey Daniel!", "voice.mp3"))
```

---