# SharePoint_full_stats.ps1 – Installation & Test

## 📦 Installation – Alle benötigten Module

### 1. PowerShell 7+ installieren (falls nicht vorhanden)
```powershell
# Check version
$PSVersionTable.PSVersion

# PowerShell 7 installieren (Windows)
winget install Microsoft.PowerShell
# oder Download: https://github.com/PowerShell/PowerShell/releases
```

### 2. PnP.PowerShell Modul installieren
```powershell
# Als Admin ausführen!
Install-Module -Name PnP.PowerShell -Force -AllowClobber

# Bei Fehlern (Execution Policy):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Modul überprüfen
Get-Module -Name PnP.PowerShell -ListAvailable
```

### 3. Microsoft Online Modules (optional, für Admin-Zugriff)
```powershell
Install-Module -Name Microsoft.Online.SharePoint.PowerShell -Force
Install-Module -Name SharePointPnPPowerShellOnline -Force
```

---

## 🧪 Testen – Schritt für Schritt

### Schritt 1: Modul-Check
```powershell
# Prüfen ob PnP.PowerShell installiert ist
Get-Module -Name PnP.PowerShell -ListAvailable

# Falls nicht: installieren
Install-Module -Name PnP.PowerShell -Force
```

### Schritt 2: WhatIf-Modus (Trockenübung)
```powershell
# Wechsel ins Script-Verzeichnis
cd C:\Pfad\Zu\Deinen\Scripts

# WhatIf-Modus – verbindet sich NICHT, zeigt nur was passieren würde
.\SharePoint_full_stats.ps1 -WhatIf
```

**Erwartete Ausgabe:**
```
🚀 Starte SharePoint Statistiken Erfassung
   Max Depth: 4 Ebenen
   Export Path: .\SharePoint_Stats_[Timestamp]
⚠️ WHATIF MODE - Keine echte Ausführung
```

### Schritt 3: Echter Test mit einer Site
```powershell
# Nur eine bestimmte Site testen (schneller!)
.\SharePoint_full_stats.ps1 `
  -SharePointAdminUrl "https://DEINTENANT-admin.sharepoint.com" `
  -SiteFilter "*Test*" `
  -Verbose
```

### Schritt 4: Vollständiger Lauf (alle Sites)
```powershell
# Alle Sites erfassen (kann bei vielen Sites dauern!)
.\SharePoint_full_stats.ps1 `
  -SharePointAdminUrl "https://DEINTENANT-admin.sharepoint.com" `
  -IncludeStorageUsage `
  -IncludePermissions
```

---

## 📁 Wo werden die Reports gespeichert?

**Standard:** Im **aktuellen Verzeichnis**, wo du das Script ausführst!

**Struktur:**
```
C:\Pfad\Wo\Du\Das\Script\Ausführst\
└── SharePoint_Stats_20260309_230000/    ← Timestamp-Ordner
    ├── SharePoint_Stats_Report.html     ← 📄 HTML Report (wird auto-geöffnet)
    ├── SharePoint_Stats_Data.csv        ← 📊 Excel-Daten
    └── SharePoint_Stats_Log.txt         ← 📝 Error-Log
```

**Beispiel:**
```powershell
# Wenn du hier bist:
CD C:\Users\Daniel\Documents\Scripts

# Und das Script ausführst:
.\SharePoint_full_stats.ps1 -SharePointAdminUrl "https://..."

# Dann landen die Reports hier:
C:\Users\Daniel\Documents\Scripts\SharePoint_Stats_20260309_230000\
```

**Eigener Pfad:** Du kannst den Export-Pfad anpassen:
```powershell
.\SharePoint_full_stats.ps1 `
  -SharePointAdminUrl "https://..." `
  -ExportPath "C:\Reports\SharePoint"
```

---

## 🔐 Login-Prozess

Beim ersten Ausführen öffnet sich ein **Browser-Fenster**:

1. Microsoft-Login (deine O365 Credentials)
2. Zustimmung zu PnP.PowerShell Permissions
3. Script läuft weiter

**Auth-Methoden:**
- `-Interactive` (Standard) – Browser-Login
- `-AzureEnvironment` – für Azure AD
- App-Only – für automatisierte Scripts (nicht hier)

---

## ⏱️ Laufzeit (ca.)

| Sites | Ohne Storage/Perms | Mit Storage/Perms |
|-------|-------------------|-------------------|
| 10    | 2-3 Min           | 5-7 Min           |
| 50    | 10-15 Min         | 20-30 Min         |
| 100   | 20-30 Min         | 40-60 Min         |

**Tipp:** Erst mit `-SiteFilter` testen, dann voll laufen lassen!

---

## 🐛 Troubleshooting

### Fehler: "Module not found"
```powershell
Install-Module -Name PnP.PowerShell -Force -AllowClobber
```

### Fehler: "Execution Policy"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### Fehler: "Authentication failed"
- Stelle sicher dass du Admin-Zugriff auf SharePoint hast
- Versuche mit explizitem Login:
```powershell
Connect-PnPOnline -Url "https://deintenant-admin.sharepoint.com" -Interactive
.\SharePoint_full_stats.ps1 -SharePointAdminUrl "https://deintenant-admin.sharepoint.com"
```

### Fehler: "Get-PnPTenantSite not found"
- Du brauchst **Tenant Admin** Rechte
- Oder verwende normale Site-URL statt Admin-URL

### Script zu langsam
- Verwende `-SiteFilter` für weniger Sites
- Lass `-IncludeStorageUsage` und `-IncludePermissions` weg
- Reduziere MaxDepth im Script (Zeile 17)

---

## ✅ Checkliste vor dem ersten Run

- [ ] PowerShell 7+ installiert?
- [ ] PnP.PowerShell Modul installiert?
- [ ] Script von GitHub heruntergeladen?
- [ ] Tenant-Admin-URL bekannt? (z.B. `https://contoso-admin.sharepoint.com`)
- [ ] Admin-Rechte für SharePoint?
- [ ] WhatIf-Modus erfolgreich getestet?
- [ ] Test mit `-SiteFilter` erfolgreich?

---

**Viel Erfolg! 🚀**

Bei Fragen: Einfach melden.
