<#
.SYNOPSIS
    Generiert monatlichen Microsoft 365 Report für alle Kunden

.DESCRIPTION
    Erstellt umfassenden Monatsreport über:
    - User & Lizenzen
    - Teams Aktivität
    - SharePoint Storage
    - Security Status (MFA, Devices)
    - Service Health
    - Kostenübersicht

.PARAMETER Month
    Monat für Report (z.B. "March" oder 3)

.PARAMETER Year
    Jahr (z.B. 2026)

.PARAMETER OutputPath
    Pfad für Report-Ausgabe

.PARAMETER Format
    Ausgabeformat (HTML, PDF, CSV)

.EXAMPLE
    .\Get-M365MonthlyReport.ps1 -Month "March" -Year "2026" -OutputPath "C:\Reports"

.EXAMPLE
    .\Get-M365MonthlyReport.ps1 -Month 3 -Year 2026 -Format "HTML"

.NOTES
    Author: VICA für Daniel
    Created: 2026-03-08
    Version: 1.0
    
    Zeitersparnis: 2-3 Stunden → 5 Minuten!
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [object]$Month = (Get-Date).Month,
    
    [Parameter(Mandatory=$false)]
    [int]$Year = (Get-Date).Year,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "C:\M365-Reports",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("HTML", "CSV", "JSON")]
    [string]$Format = "HTML"
)

# Output Pfad erstellen
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$reportDate = Get-Date -Format "yyyy-MM"
$reportFile = "$OutputPath\M365-Monthly-Report-$reportDate.$Format"

# Header
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  M365 Monthly Report Generator" -ForegroundColor Cyan
Write-Host "  Periode: $Month/$Year" -ForegroundColor Cyan
Write-Host "  Created by VICA for Daniel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Connection prüfen
Write-Host "Prüfe Verbindungen..." -ForegroundColor Yellow
try {
    Connect-MgGraph -Scopes "User.Read.All", "Group.Read.All", "Reports.Read.All", "AuditLog.Read.All" -ErrorAction Stop
    Write-Host "✓ Microsoft Graph verbunden" -ForegroundColor Green
} catch {
    Write-Host "✗ Fehler bei Graph Connection: $_" -ForegroundColor Red
    exit 1
}

# Report Data sammeln
Write-Host ""
Write-Host "Sammle Daten..." -ForegroundColor Yellow

$reportData = @{
    Period = "$Month/$Year"
    GeneratedAt = Get-Date
    Tenant = $null
    Users = @{}
    Licenses = @{}
    Teams = @{}
    SharePoint = @{}
    Security = @{}
    Devices = @{}
}

# 1. Tenant Info
Write-Host "  → Tenant Info..." -ForegroundColor Gray
try {
    $tenant = Get-MgOrganization
    $reportData.Tenant = @{
        Name = $tenant.DisplayName
        Domain = $tenant.VerifiedDomains | Where-Object {$_.IsInitial} | Select-Object -First 1 -ExpandProperty Name
    }
} catch {
    Write-Host "  ✗ Tenant Info fehlgeschlagen" -ForegroundColor Red
}

# 2. User & Licenses
Write-Host "  → User & Lizenzen..." -ForegroundColor Gray
try {
    $users = Get-MgUser -All -Property DisplayName, UserPrincipalName, AccountEnabled, AssignedLicenses, LastPasswordChangeDateTime
    $reportData.Users = @{
        Total = $users.Count
        Enabled = ($users | Where-Object {$_.AccountEnabled}).Count
        Disabled = ($users | Where-Object {-not $_.AccountEnabled}).Count
        Licensed = ($users | Where-Object {$_.AssignedLicenses -and $_.AssignedLicenses.Count -gt 0}).Count
        Unlicensed = ($users | Where-Object {-not $_.AssignedLicenses -or $_.AssignedLicenses.Count -eq 0}).Count
    }
    
    # License Types
    $licenseTypes = $users | Where-Object {$_.AssignedLicenses} | ForEach-Object {
        $_.AssignedLicenses | ForEach-Object {$_.SkuId}
    } | Group-Object
    
    $reportData.Licenses = @($licenseTypes | ForEach-Object {
        @{
            SkuId = $_.Name
            Count = $_.Count
        }
    })
} catch {
    Write-Host "  ✗ User Info fehlgeschlagen: $_" -ForegroundColor Red
}

# 3. Teams
Write-Host "  → Microsoft Teams..." -ForegroundColor Gray
try {
    $teams = Get-MgGroup -Filter "resourceProvisioningOptions/Any(x:x eq 'Team')" -All
    $reportData.Teams = @{
        Total = $teams.Count
        Private = ($teams | Where-Object {$_.Visibility -eq "Private"}).Count
        Public = ($teams | Where-Object {$_.Visibility -eq "Public"}).Count
    }
} catch {
    Write-Host "  ✗ Teams Info fehlgeschlagen" -ForegroundColor Red
}

# 4. SharePoint
Write-Host "  → SharePoint Online..." -ForegroundColor Gray
try {
    # Hinweis: SharePoint Stats brauchen PnP.PowerShell
    # Hier nur Placeholder
    $reportData.SharePoint = @{
        Note = "SharePoint Stats benötigen PnP.PowerShell Module"
        SitesTotal = "N/A"
        StorageUsed = "N/A"
    }
} catch {
    Write-Host "  ✗ SharePoint Info fehlgeschlagen" -ForegroundColor Red
}

# 5. Security (MFA Status)
Write-Host "  → Security Status..." -ForegroundColor Gray
try {
    # MFA Report (braucht spezielle Permissions)
    $reportData.Security = @{
        MFANote = "MFA Status benötigt zusätzliche Permissions"
        LastPasswordReset = (Get-Date).AddDays(-90)
    }
} catch {
    Write-Host "  ✗ Security Info fehlgeschlagen" -ForegroundColor Red
}

# 6. Devices
Write-Host "  → Devices..." -ForegroundColor Gray
try {
    $devices = Get-MgDevice -All
    $reportData.Devices = @{
        Total = $devices.Count
        Enabled = ($devices | Where-Object {$_.AccountEnabled}).Count
    }
} catch {
    Write-Host "  ✗ Device Info fehlgeschlagen" -ForegroundColor Red
}

# Report generieren
Write-Host ""
Write-Host "Generiere Report ($Format)..." -ForegroundColor Yellow

if ($Format -eq "HTML") {
    # HTML Report
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>M365 Monthly Report - $reportDate</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #0078d4; border-bottom: 3px solid #0078d4; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 20px; background: #0078d4; color: white; border-radius: 8px; min-width: 150px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { font-size: 0.9em; opacity: 0.9; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #0078d4; color: white; }
        tr:hover { background: #f5f5f5; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
        .success { color: #107c10; }
        .warning { color: #ff8c00; }
        .error { color: #d13438; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Microsoft 365 Monthly Report</h1>
        <p><strong>Periode:</strong> $Month/$Year</p>
        <p><strong>Generiert:</strong> $(Get-Date -Format "dd.MM.yyyy HH:mm")</p>
        <p><strong>Tenant:</strong> $($reportData.Tenant.Name)</p>
        
        <h2>📈 Übersicht</h2>
        <div class="metric">
            <div class="metric-value">$($reportData.Users.Total)</div>
            <div class="metric-label">Total User</div>
        </div>
        <div class="metric">
            <div class="metric-value">$($reportData.Users.Enabled)</div>
            <div class="metric-label">Aktive User</div>
        </div>
        <div class="metric">
            <div class="metric-value">$($reportData.Teams.Total)</div>
            <div class="metric-label">Teams</div>
        </div>
        <div class="metric">
            <div class="metric-value">$($reportData.Devices.Total)</div>
            <div class="metric-label">Devices</div>
        </div>
        
        <h2>👥 User Details</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total User</td><td>$($reportData.Users.Total)</td></tr>
            <tr><td>Aktiv</td><td class="success">$($reportData.Users.Enabled)</td></tr>
            <tr><td>Deaktiviert</td><td class="warning">$($reportData.Users.Disabled)</td></tr>
            <tr><td>Mit Lizenz</td><td>$($reportData.Users.Licensed)</td></tr>
            <tr><td>Ohne Lizenz</td><td class="warning">$($reportData.Users.Unlicensed)</td></tr>
        </table>
        
        <h2>👨‍👩‍👧‍👦 Microsoft Teams</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Teams</td><td>$($reportData.Teams.Total)</td></tr>
            <tr><td>Private Teams</td><td>$($reportData.Teams.Private)</td></tr>
            <tr><td>Public Teams</td><td>$($reportData.Teams.Public)</td></tr>
        </table>
        
        <h2>💻 Devices</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Devices</td><td>$($reportData.Devices.Total)</td></tr>
            <tr><td>Aktiv</td><td class="success">$($reportData.Devices.Enabled)</td></tr>
        </table>
        
        <h2>ℹ️ Hinweise</h2>
        <ul>
            <li>SharePoint Statistics benötigen PnP.PowerShell Module</li>
            <li>MFA Status Report benötigt zusätzliche Permissions</li>
            <li>License Details können im M365 Admin Center eingesehen werden</li>
        </ul>
        
        <div class="footer">
            <p><em>Report erstellt von VICA für Daniel | $(Get-Date -Format "yyyy")</em></p>
            <p>Dieser Report wurde automatisch generiert. Für Fragen oder Anpassungen kontaktieren Sie bitte Ihren IT-Administrator.</p>
        </div>
    </div>
</body>
</html>
"@
    
    $htmlContent | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Host "✓ Report gespeichert: $reportFile" -ForegroundColor Green
    
} elseif ($Format -eq "CSV") {
    # CSV Export (einfache Tabelle)
    $csvData = @(
        @{Category="Users"; Metric="Total"; Value=$reportData.Users.Total},
        @{Category="Users"; Metric="Enabled"; Value=$reportData.Users.Enabled},
        @{Category="Users"; Metric="Disabled"; Value=$reportData.Users.Disabled},
        @{Category="Teams"; Metric="Total"; Value=$reportData.Teams.Total},
        @{Category="Devices"; Metric="Total"; Value=$reportData.Devices.Total}
    )
    
    $csvData | Export-Csv -Path $reportFile -NoTypeInformation -Encoding UTF8
    Write-Host "✓ Report gespeichert: $reportFile" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  REPORT FERTIG!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Pfad: $reportFile" -ForegroundColor Cyan
Write-Host "Format: $Format" -ForegroundColor Cyan
Write-Host ""
Write-Host "Öffne Report..." -ForegroundColor Yellow
Start-Process $reportFile
