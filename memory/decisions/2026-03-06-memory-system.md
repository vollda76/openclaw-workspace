# 2026-03-06 – Memory System Optimierung

**Tags:** `#entscheidung` `#system` `#optimierung` `#memory` `#struktur`

## Entscheidung
Memory-System von flacher Struktur auf kategorisierte Ordner umgestellt.

## Warum?
- Schnellere Navigation für VICA
- Bessere Organisation bei wachsender Memory-Grösse
- Projekte separat von Daily-Logs
- Präferenzen zentral (Daniel's Infos)

## Neue Struktur
```
memory/
├── INDEX.md              ← Quick-Access, Tags, Links
├── daily/                ← Tägliche Logs (raw)
│   └── 2026-03-06.md
├── projects/             ← Projekt-spezifisch
│   └── steinegger-it.md
├── decisions/            ← Wichtige Entscheidungen
│   └── 2026-03-06-memory-system.md
└── preferences/          ← Daniel's Präferenzen
    └── daniel.md
```

## Vorteile
1. **Geschwindigkeit:** Direkter Zugriff auf relevante Infos
2. **Skalierung:** Bei 100+ Memory-Files noch navigierbar
3. **Kontext:** Projekt-Info separat von Daily-Chaos
4. **Sicherheit:** Präferenzen klar getrennt (nicht in Groups laden!)

## Implementation
- INDEX.md mit Quick-Links ([[projects/steinegger-it]])
- Tags: #aktiv, #entscheidung, #präferenz, #credential, #completed
- Fast-Access Section für häufig genutzte Infos (FTP, Dropbox, etc.)

## Next Steps
- Bei neuen Projekten: projects/*.md anlegen
- Wichtige Entscheidungen: decisions/*.md
- Daily-Logs bleiben in daily/
