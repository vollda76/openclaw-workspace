# 🔧 Installation Guide – PowerShell Scripts

**Für:** Daniel (KMU IT-Betreuung)  
**Stand:** 2026-03-08  
**Erstellt von:** VICA

---

## 📋 Voraussetzungen

### 1. **PowerShell 7+ installieren**

**Windows:**
```powershell
# Winget (empfohlen)
winget install Microsoft.PowerShell

# Oder Chocolatey
choco install powershell-core

# Oder MSI von GitHub:
# https://github.com/PowerShell/PowerShell/releases
```

**Überprüfen:**
```powershell
pwsh --version
# Sollte 7.x.x anzeigen
```

---

### 2. **Microsoft Graph Module installieren**

**Einmalig ausführen (als Admin):**
```powershell
# Microsoft Graph SDK
Install-Module -Name Microsoft.Graph -Scope CurrentUser -Force

# Microsoft Teams (optional, für Teams-Scripts)
Install-Module -Name MicrosoftTeams -Scope CurrentUser -Force

# PnP PowerShell (für SharePoint, optional)
Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force
```

**Überprüfen:**
```powershell
Get-Module -Name Microsoft.Graph -ListAvailable
```

---

### 3. **Mit Microsoft 365 verbinden**

**Vor jeder Script-Ausführung:**
```powershell
# Für User/Groups Scripts:
Connect-MgGraph -Scopes "User.ReadWrite.All","Group.ReadWrite.All","Directory.ReadWrite.All"

# Für Teams Scripts:
Connect-MgGraph -Scopes "Group.ReadWrite.All","Team.Create"

# Für Reports (Read-Only):
Connect-MgGraph -Scopes "User.Read.All","Group.Read.All","Reports.Read.All"
```

**Erfolg prüfen:**
```powershell
Get-MgContext
# Zeigt verbundenes Konto
```

---

## 📁 Scripts einrichten

### 1. **Scripts herunterladen**

Alle Scripts aus Dropbox kopieren nach:
```
C:\Scripts\M365\
├── 01-user-management\
├── 02-teams-automation\
├── 05-monitoring\
└── templates\
```

### 2. **Ordner für Logs erstellen**
```powershell
New-Item -ItemType Directory -Path "C:\Logs" -Force
New-Item -ItemType Directory -Path "C:\M365-Reports" -Force
```

### 3. **Execution Policy setzen** (falls nötig)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🚀 Erster Test

### **Test mit WhatIf (sicher, ändert nichts!):**

```powershell
# Zum Script-Ordner navigieren
cd C:\Scripts\M365\01-user-management

# Trockenlauf (zeigt nur was passieren würde)
.\New-M365User-Bulk.ps1 -CSVFile "..\templates\user-import-template.csv" -WhatIf
```

**Erwartete Ausgabe:**
```
WhatIf: Würde User erstellen: max.muster@firma.ch
WhatIf: Würde User erstellen: anna.beispiel@firma.ch
...
```

---

## 📊 Script im Produktiv-Modus

### **Beispiel: Neue User erstellen**

1. **CSV vorbereiten:**
   ```powershell
   notepad C:\Scripts\M365\newusers.csv
   ```
   
   Inhalt:
   ```csv
   DisplayName,UPN,Department,License,Groups
   "Thomas Huber",,Sales,ENTERPRISEPACK,Vertrieb;All
   "Sandra Keller",,IT,ENTERPRISEPACK,IT-Admin
   ```

2. **Script ausführen:**
   ```powershell
   .\New-M365User-Bulk.ps1 -CSVFile "C:\Scripts\M365\newusers.csv" -Domain "firma.ch"
   ```

3. **Ergebnis prüfen:**
   - Log-Datei: `C:\Logs\M365-User-Creation-YYYYMMDD-HHMMSS.log`
   - Password-Files: `C:\Logs\NewUser-{GUID}.txt`

---

## 🔐 Sicherheitshinweise

### **Berechtigungen:**
- Scripts brauchen **Admin-Rechte** in M365
- Nur mit vertrauenswürdigen Accounts verwenden
- Log-Files enthalten sensible Daten (Passwörter!)

### **Best Practices:**
1. **Immer zuerst mit `-WhatIf` testen**
2. **Log-Files sicher speichern** (verschlüsselter Ordner)
3. **Passwörter persönlich übergeben** (nicht per Email)
4. **Regelmässig Scripts updaten**
5. **Execution Policy auf RemoteSigned belassen**

---

## 🐛 Troubleshooting

### **"Module nicht gefunden"**
```powershell
# Module neu installieren
Install-Module -Name Microsoft.Graph -Scope CurrentUser -Force -AllowClobber
```

### **"Keine Verbindung"**
```powershell
# Disconnect und neu connecten
Disconnect-MgGraph
Connect-MgGraph -Scopes "User.ReadWrite.All"
```

### **"Permission denied"**
- Admin-Rechte prüfen
- Scopes bei Connect-MgGraph erweitern
- In M365 Admin Center Berechtigungen prüfen

### **"Script kann nicht ausgeführt werden"**
```powershell
# Execution Policy prüfen
Get-ExecutionPolicy

# Falls "Restricted":
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📞 Support

**Bei Problemen:**
1. Log-Datei prüfen
2. PowerShell-Version checken (`$PSVersionTable`)
3. M365 Admin Center konsultieren
4. Daniel kontaktieren oder VICA fragen

---

## 📚 Nützliche Befehle

```powershell
# Alle installierten Module
Get-Module -Name Microsoft.Graph* -ListAvailable

# Verbundene Sessions
Get-MgContext

# Verfügbare Lizenzen im Tenant
Get-MgSubscribedSku | Select SkuPartNumber

# Alle User auflisten
Get-MgUser -All | Select DisplayName, UserPrincipalName, AccountEnabled

# Alle Teams auflisten
Get-MgGroup -Filter "resourceProvisioningOptions/Any(x:x eq 'Team')" | Select DisplayName
```

---

**Viel Erfolg!** 🚀  
*Erstellt von VICA für Daniel | 2026-03-08*
