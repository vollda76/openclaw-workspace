# 📁 Dropbox-Ordnerstruktur für PowerShell Scripts

**Empfohlene Struktur für Dropbox:**

```
Dropbox/
└── IT-Scripts/
    └── M365-PowerShell-Scripts/
        ├── README.md                 ← Diese Datei
        ├── INSTALL.md                ← Installations-Anleitung
        │
        ├── 01-user-management/
        │   ├── New-M365User-Bulk.ps1
        │   └── New-M365User-Bulk.txt
        │
        ├── 02-teams-automation/
        │   ├── New-TeamsProject.ps1
        │   └── New-TeamsProject.txt
        │
        ├── 03-sharepoint/
        │   └── (kommt noch)
        │
        ├── 04-security/
        │   └── (kommt noch)
        │
        ├── 05-monitoring/
        │   ├── Get-M365MonthlyReport.ps1
        │   └── Get-M365MonthlyReport.txt
        │
        └── templates/
            ├── user-import-template.csv
            └── members-template.csv
```

---

## 📋 Anleitung zum Hochladen

### **Option 1: Manuelles Hochladen (einfach)**

1. **Dropbox öffnen** (https://dropbox.com)
2. **Neuen Ordner erstellen:** `IT-Scripts/M365-PowerShell-Scripts/`
3. **Alle Dateien hochladen:**
   - README.md
   - INSTALL.md
   - Alle .ps1 und .txt Files in die entsprechenden Unterordner
   - Templates in den templates/ Ordner

### **Option 2: Dropbox Desktop App (empfohlen)**

1. **Dropbox Desktop App installieren** (falls nicht vorhanden)
2. **Lokalen Dropbox-Ordner öffnen**
3. **Ordnerstruktur erstellen** wie oben gezeigt
4. **Files rein kopieren** – synchronisiert automatisch

---

## 📦 Download von VICA

VICA hat ein komplettes Archiv erstellt:

**Pfad:** `/data/.openclaw/workspace/M365-PowerShell-Scripts.tar.gz`

**Entpacken:**
```bash
# Windows (mit 7-Zip oder WinRAR)
# Rechtsklick → Extract here

# Mac/Linux
tar -xzf M365-PowerShell-Scripts.tar.gz
```

Danach alle Files in Dropbox hochladen!

---

## ✅ Checkliste nach Upload

- [ ] README.md hochgeladen
- [ ] INSTALL.md hochgeladen
- [ ] 01-user-management/ Ordner mit Scripts
- [ ] 02-teams-automation/ Ordner mit Scripts
- [ ] 05-monitoring/ Ordner mit Scripts
- [ ] templates/ Ordner mit CSV-Vorlagen
- [ ] Ordner-Freigabe für Team-Mitglieder (optional)

---

## 🔄 Synchronisation

**Empfehlung:**
- Scripts in Dropbox **immer aktuell halten**
- Bei Änderungen: **Versionsnummer** in Scripts erhöhen
- **Changelog** führen (wer hat was geändert wann)

---

## 🔐 Sicherheit

**Wichtig:**
- Dropbox-Zugriff nur für autorisierte IT-Mitarbeiter
- Scripts enthalten keine Passwörter (sind sicher)
- Log-Files NICHT in Dropbox speichern (lokal auf C:\Logs)
- Regelmässig **Backup** der Scripts machen

---

## 📞 Fragen?

Bei Fragen zur Struktur oder zum Upload:
→ Daniel kontaktieren
→ VICA fragen

---

*Erstellt: 2026-03-08 | Version: 1.0 | Author: VICA für Daniel*
