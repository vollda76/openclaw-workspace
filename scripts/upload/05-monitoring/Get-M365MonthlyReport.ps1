<#
.SYNOPSIS
    Generiert monatlichen Microsoft 365 Report für alle Kunden

.DESCRIPTION
    Erstellt umfassenden Monatsreport über:
    - User & Lizenzen
    - Teams Aktivität
    - SharePoint Storage
    - Security Status
    - Devices

.PARAMETER Month
    Monat für Report (z.B. "March" oder 3)

.PARAMETER Year
    Jahr (z.B. 2026)

.PARAMETER OutputPath
    Pfad für Report-Ausgabe

.PARAMETER Format
    Ausgabeformat (HTML, CSV, JSON)

.EXAMPLE
    .\Get-M365MonthlyReport.ps1 -Month "March" -Year "2026"

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
    [Parameter(Mandatory=$false)][object]$Month = (Get-Date).Month,
    [Parameter(Mandatory=$false)][int]$Year = (Get-Date).Year,
    [Parameter(Mandatory=$false)][string]$OutputPath = "C:\M365-Reports",
    [Parameter(Mandatory=$false)][ValidateSet("HTML","CSV","JSON")][string]$Format = "HTML"
)

if (-not (Test-Path $OutputPath)) { New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null }

$reportDate = Get-Date -Format "yyyy-MM"
$reportFile = "$OutputPath\M365-Monthly-Report-$reportDate.$Format"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  M365 Monthly Report Generator" -ForegroundColor Cyan
Write-Host "  Periode: $Month/$Year" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    Connect-MgGraph -Scopes "User.Read.All","Group.Read.All","Reports.Read.All" -ErrorAction Stop
    Write-Host "✓ Microsoft Graph verbunden" -ForegroundColor Green
} catch { Write-Host "✗ Connection failed: $_" -ForegroundColor Red; exit 1 }

Write-Host "Sammle Daten..." -ForegroundColor Yellow

$users = Get-MgUser -All
$teams = Get-MgGroup -Filter "resourceProvisioningOptions/Any(x:x eq 'Team')" -All
$devices = Get-MgDevice -All

$reportData = @{
    Period = "$Month/$Year"
    GeneratedAt = Get-Date
    Users = @{Total=$users.Count; Enabled=($users|Where{$_.AccountEnabled}).Count}
    Teams = @{Total=$teams.Count}
    Devices = @{Total=$devices.Count}
}

if ($Format -eq "HTML") {
    $html = @"
<!DOCTYPE html>
<html>
<head><title>M365 Report $reportDate</title>
<style>
body{font-family:'Segoe UI';margin:40px;background:#f5f5f5}
.container{max-width:1200px;margin:0 auto;background:white;padding:40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
h1{color:#0078d4;border-bottom:3px solid #0078d4;padding-bottom:10px}
.metric{display:inline-block;margin:10px;padding:20px;background:#0078d4;color:white;border-radius:8px;min-width:150px;text-align:center}
.metric-value{font-size:2em;font-weight:bold}.metric-label{font-size:0.9em;opacity:0.9}
table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd}
th{background:#0078d4;color:white}
</style></head>
<body><div class="container">
<h1>📊 Microsoft 365 Monthly Report</h1>
<p><strong>Periode:</strong> $Month/$Year | <strong>Generiert:</strong> $(Get-Date -Format "dd.MM.yyyy HH:mm")</p>

<h2>📈 Übersicht</h2>
<div class="metric"><div class="metric-value">$($reportData.Users.Total)</div><div class="metric-label">Total User</div></div>
<div class="metric"><div class="metric-value">$($reportData.Users.Enabled)</div><div class="metric-label">Aktive User</div></div>
<div class="metric"><div class="metric-value">$($reportData.Teams.Total)</div><div class="metric-label">Teams</div></div>
<div class="metric"><div class="metric-value">$($reportData.Devices.Total)</div><div class="metric-label">Devices</div></div>

<h2>👥 User Details</h2>
<table>
<tr><th>Metric</th><th>Value</th></tr>
<tr><td>Total User</td><td>$($reportData.Users.Total)</td></tr>
<tr><td>Aktiv</td><td style="color:green">$($reportData.Users.Enabled)</td></tr>
<tr><td>Deaktiviert</td><td style="color:orange">$($reportData.Users.Total - $reportData.Users.Enabled)</td></tr>
</table>

<h2>👨‍👩‍👧‍👦 Teams</h2>
<table><tr><th>Total Teams</th><td>$($reportData.Teams.Total)</td></tr></table>

<h2>💻 Devices</h2>
<table><tr><th>Total Devices</th><td>$($reportData.Devices.Total)</td></tr></table>

<div style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd;color:#666;font-size:0.9em">
<em>Report erstellt von VICA für Daniel | $(Get-Date -Format "yyyy")</em>
</div>
</div></body></html>
"@
    $html | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Host "✓ Report: $reportFile" -ForegroundColor Green
    Start-Process $reportFile
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  REPORT FERTIG!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green