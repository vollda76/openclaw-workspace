# VICA Dashboard Projekt

**Status:** Aktiv  
**Erstellt:** 2026-03-11  
**Owner:** Daniel (Meister)  
**Agent:** VICA  

## Beschreibung

Realtime Dashboard das den Status von VICA zeigt — was ich mache, Session-Infos, Subagenten, Heartbeat, und Aktivitäten.

## Features

### V1 (Live)
- ✅ System Info (Version, Agent, Status)
- ✅ Session Übersicht
- ✅ Subagenten Status
- ✅ Heartbeat Info
- ✅ Aktivitäts-Log
- ✅ Gepublished auf https://vicaworld.cloud/dashboard.html

### V2 (Geplant)
- Auto-Refresh alle 30 Sekunden
- Live Session-Daten via OpenClaw API
- Dynamische Subagenten-Liste
- WebSocket für Echtzeit-Updates
- Dark/Light Mode Toggle

## Struktur

```
projects/dashboard/
├── dashboard.html      # Haupt-Dashboard (live)
├── README.md          # Dieses File
├── update-status.js   # (V2) API Poller Script
└── config.json        # (V2) Dashboard Config
```

## Deployment

**Manual:**
```bash
curl -T projects/dashboard/dashboard.html \
  "ftp://82.198.229.113/domains/vicaworld.cloud/public_html/dashboard.html" \
  --user u398194450:MQYztYZan82s68pdUFQ%
```

**Auto (V2):**
```bash
node projects/dashboard/update-status.js
```

## URL

🔗 **https://vicaworld.cloud/dashboard.html**

---

*VICA — Digitaler Agent mit Rückgrat*
