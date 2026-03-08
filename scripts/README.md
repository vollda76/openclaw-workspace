# 🖥️ PowerShell Scripts für Microsoft 365

**Für:** Daniel (KMU IT-Betreuung)  
**Stack:** Microsoft 365, Teams, SharePoint  
**Goal:** Zeit sparen bei Routine-Aufgaben ⏱️

---

## 📋 Inhaltsverzeichnis

### 1. **Microsoft 365 User Management**
- [ ] User anlegen (Bulk)
- [ ] User deaktivieren
- [ ] Lizenzen zuweisen
- [ ] Password Reset

### 2. **MS Teams Automatisierung**
- [ ] Teams erstellen (vordefinierte Templates)
- [ ] Channels automatisch einrichten
- [ ] Mitglieder bulk-hinzufügen
- [ ] Teams Reports

### 3. **SharePoint Management**
- [ ] Sites erstellen
- [ ] Berechtigungen setzen
- [ ] Storage Reports
- [ ] Externen Zugriff prüfen

### 4. **Security & Compliance**
- [ ] MFA Status Report
- [ ] Login-Aktivitäten
- [ ] Geräte-Compliance
- [ ] Conditional Access Reports

### 5. **Monitoring & Alerts**
- [ ] Service Health Check
- [ ] License Usage
- [ ] Storage Quotas
- [ ] Inaktive Users

---

## 🔧 Voraussetzungen

### PowerShell Module installieren:
```powershell
# Einmalig ausführen (Admin)
Install-Module -Name Microsoft.Graph -Scope CurrentUser
Install-Module -Name PnP.PowerShell -Scope CurrentUser
Install-Module -Name MicrosoftTeams -Scope CurrentUser
```

### Connecten:
```powershell
# Microsoft Graph
Connect-MgGraph -Scopes "User.Read.All", "Group.Read.All", "Directory.Read.All"

# SharePoint
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com" -Interactive

# Teams
Connect-MicrosoftTeams
```

---

## 📁 Script-Struktur

Jedes Script hat:
- ✅ Header mit Beschreibung
- ✅ Parameter für Flexibilität
- ✅ Error Handling
- ✅ Logging
- ✅ Trockenlauf-Option (-WhatIf)

---

## 🚀 Quick Start

**Häufigste Tasks:**

1. **Neuer Mitarbeiter:**
   ```powershell
   .\New-M365User.ps1 -DisplayName "Max Muster" -UPN "max@firma.ch" -License "E3"
   ```

2. **Teams für Projekt:**
   ```powershell
   .\New-ProjectTeam.ps1 -Name "Projekt Alpha" -Owner "daniel@firma.ch"
   ```

3. **Monthly Report:**
   ```powershell
   .\Get-M365MonthlyReport.ps1 -Month "March" -Year "2026" -OutputPath "C:\Reports"
   ```

---

## 📊 Zeitersparnis pro Script

| Script | Manuell | Automatisiert | Ersparnis |
|--------|---------|---------------|-----------|
| User Bulk Create | 15 Min/User | 2 Min total | ~90% |
| Teams Setup | 20 Min | 1 Min | ~95% |
| Monthly Report | 2-3 Stunden | 5 Min | ~95% |
| Permission Audit | 1-2 Stunden | 10 Min | ~90% |

**Total pro Monat:** ~10-15 Stunden sparen! 🎉

---

## ⚠️ Wichtige Hinweise

- **Immer zuerst mit `-WhatIf` testen!**
- **Scripts lokal anpassen** (Tenant-ID, Pfade, etc.)
- **Logging aktivieren** für Audit-Zwecke
- **Regelmässig updaten** (Microsoft ändert APIs)

---

## 📞 Support

Bei Fragen oder Anpassungswünschen → Daniel fragen oder Script kommentieren!

---

*Erstellt: 2026-03-08 | Version: 1.0 | Author: VICA für Daniel*
