# SharePoint_full_stats.ps1
# ============================================================================
# Zweck: Erfasst SharePoint Online Statistiken OHNE Setup bei Kunden!
#
# Autor: VICA fuer Daniel Vollmer
# Datum: 2026-03-10
# Version: 2.1 - Multi-Tenant App (Setup NUR bei dir!)
# ============================================================================

param(
    [Parameter(Mandatory = $false)]
    [string]$SharePointAdminUrl = "https://yourtenant-admin.sharepoint.com",
    
    [Parameter(Mandatory = $false)]
    [string]$ExportPath = ".\SharePoint_Stats_$(Get-Date -Format 'yyyyMMdd_HHmmss')",
    
    [Parameter(Mandatory = $false)]
    [switch]$IncludeStorageUsage,
    
    [Parameter(Mandatory = $false)]
    [switch]$IncludePermissions,
    
    [Parameter(Mandatory = $false)]
    [string]$SiteFilter,
    
    [Parameter(Mandatory = $false)]
    [switch]$WhatIf
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$ErrorActionPreference = "Stop"
$MaxDepth = 4
$VerbosePreference = "Continue"

# WICHTIG: Diese Client ID muss NUR BEI DIR im Azure AD registriert werden!
# Bei Kunden ist KEIN Setup noetig - sie muessen nur im Browser zustimmen.
#
# Setup (NUR EINMAL bei dir):
# 1. Azure Portal -> App Registrations -> New Registration
# 2. Name: "SharePoint Stats Tool"
# 3. Supported account types: "Accounts in any organizational directory"
# 4. Redirect URI: https://login.microsoftonline.com/common/oauth2/nativeclient
# 5. API Permissions: Sites.FullControl.All + User.Read (Delegated)
# 6. Grant Admin Consent (in DEINEM Tenant)
# 7. Client ID hier eintragen:
$appClientId = "DEINE-CLIENT-ID-HIER-EINTRAGEN"

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "Starte SharePoint Statistiken Erfassung" -ForegroundColor Green
Write-Host "   Max Depth: $MaxDepth Ebenen" -ForegroundColor Gray
Write-Host "   Export Path: $ExportPath" -ForegroundColor Gray
Write-Host ""

if ($WhatIf) {
    Write-Host "WHATIF MODE - Keine echte Ausfuehrung" -ForegroundColor Yellow
    return
}

$exportDir = New-Item -ItemType Directory -Path $ExportPath -Force
Write-Host "Export Directory erstellt: $($exportDir.FullName)" -ForegroundColor Green

try {
    Write-Host "Verbinde mit SharePoint..." -ForegroundColor Cyan
    Write-Host "   Tenant: $($SharePointAdminUrl)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   ==> Browser oeffnet sich - bitte anmelden und zustimmen!" -ForegroundColor Yellow
    Write-Host "   (Beim ersten Mal am Kunden-Tenant muss ein Admin zustimmen)" -ForegroundColor Gray
    Write-Host ""
    
    # Device Code Flow - oeffnet Browser, kein Admin Consent bei Kunden!
    Connect-PnPOnline -Url $SharePointAdminUrl -ClientId $appClientId
    
    Write-Host "Lade Sites..." -ForegroundColor Cyan
    $sites = Get-PnPTenantSite
    
    if ($SiteFilter) {
        $sites = $sites | Where-Object { $_.Url -like $SiteFilter -or $_.Title -like $SiteFilter }
        Write-Host "   Gefiltert: $SiteFilter ($($sites.Count) Sites)" -ForegroundColor Yellow
    }
    
    Write-Host "   $($sites.Count) Sites gefunden" -ForegroundColor Green
    Write-Host ""
    
    $allStats = @()
    $counter = 0
    
    foreach ($site in $sites) {
        $counter++
        Write-Host "[$counter/$($sites.Count)]" -ForegroundColor Gray -NoNewline
        $stats = Get-SiteStatistics -Site $site -ClientId $appClientId
        $allStats += $stats
    }
    
    Write-Host ""
    Write-Host "Generiere Reports..." -ForegroundColor Cyan
    
    $htmlPath = Join-Path $exportDir "SharePoint_Stats_Report.html"
    $csvPath = Join-Path $exportDir "SharePoint_Stats_Data.csv"
    
    New-HTMLReport -Data $allStats -FilePath $htmlPath
    New-CSVReport -Data $allStats -FilePath $csvPath
    
    Write-Host ""
    Write-Host "Fertig! Reports: $($exportDir.FullName)" -ForegroundColor Green
    Start-Process $htmlPath
    
}
catch {
    Write-Host "Fehler: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "SETUP ANLEITUNG (NUR EINMAL bei dir!):" -ForegroundColor Yellow
    Write-Host "1. Azure Portal -> App Registrations -> New Registration" -ForegroundColor Gray
    Write-Host "2. Name: 'SharePoint Stats Tool'" -ForegroundColor Gray
    Write-Host "3. Supported: 'Accounts in any organizational directory'" -ForegroundColor Gray
    Write-Host "4. Redirect: https://login.microsoftonline.com/common/oauth2/nativeclient" -ForegroundColor Gray
    Write-Host "5. API Permissions: Sites.FullControl.All + User.Read" -ForegroundColor Gray
    Write-Host "6. Grant Admin Consent (in deinem Tenant)" -ForegroundColor Gray
    Write-Host "7. Client ID ins Skript eintragen (Zeile 36)" -ForegroundColor Gray
    throw
}
finally {
    Disconnect-PnPOnline -ErrorAction SilentlyContinue
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Get-SiteStatistics {
    param(
        [Parameter(Mandatory = $true)] $Site,
        [Parameter(Mandatory = $true)] $ClientId
    )
    
    Write-Host "  Site: $($Site.Title)" -ForegroundColor Cyan
    
    $stats = @{
        SiteTitle = $Site.Title
        SiteUrl = $Site.Url
        Owner = $Site.Owner
        TotalFolders = 0
        TotalFiles = 0
        Error = $null
    }
    
    try {
        Connect-PnPOnline -Url $Site.Url -ClientId $ClientId -ErrorAction SilentlyContinue
        $web = Get-PnPWeb -Includes RootFolder
        $rootFolder = $web.RootFolder
        $level1Stats = Get-FolderStats -Folder $rootFolder -CurrentDepth 1 -MaxDepth $MaxDepth
        $stats.TotalFolders = $level1Stats.FolderCount
        $stats.TotalFiles = $level1Stats.FileCount
    }
    catch {
        $stats.Error = $_.Exception.Message
    }
    
    return $stats
}

function Get-FolderStats {
    param(
        [Parameter(Mandatory = $true)] $Folder,
        [Parameter(Mandatory = $true)] [int]$CurrentDepth,
        [Parameter(Mandatory = $true)] [int]$MaxDepth
    )
    
    $stats = @{ FolderCount = 0; FileCount = 0 }
    if ($CurrentDepth -gt $MaxDepth) { return $stats }
    
    try {
        $folders = Get-PnPFolderItem -Folder $Folder -ItemType Folder -ErrorAction SilentlyContinue
        $files = Get-PnPFolderItem -Folder $Folder -ItemType File -ErrorAction SilentlyContinue
        
        if ($folders) {
            $stats.FolderCount = $folders.Count
            if ($CurrentDepth -lt $MaxDepth) {
                foreach ($subFolder in $folders) {
                    $subStats = Get-FolderStats -Folder $subFolder -CurrentDepth ($CurrentDepth + 1) -MaxDepth $MaxDepth
                    $stats.FolderCount += $subStats.FolderCount
                    $stats.FileCount += $subStats.FileCount
                }
            }
        }
        if ($files) { $stats.FileCount = $files.Count }
    }
    catch { }
    
    return $stats
}

function New-HTMLReport {
    param(
        [Parameter(Mandatory = $true)] $Data,
        [Parameter(Mandatory = $true)] $FilePath
    )
    
    $totalSites = $Data.Count
    $totalFiles = ($Data | Measure-Object -Property TotalFiles -Sum).Sum
    $totalFolders = ($Data | Measure-Object -Property TotalFolders -Sum).Sum
    
    $html = @"
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>SharePoint Report</title>
    <style>
        body { font-family: Segoe UI, sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #0078d4; }
        table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; }
        th { background: #0078d4; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .numeric { text-align: right; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>SharePoint Statistiken</h1>
    <p>Generiert: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')</p>
    
    <h3>Summary</h3>
    <p>Sites: $totalSites | Dateien: $totalFiles | Ordner: $totalFolders</p>
    
    <h3>Details</h3>
    <table>
        <tr><th>Site</th><th>URL</th><th>Owner</th><th>Dateien</th><th>Ordner</th><th>Status</th></tr>
"@
    
    foreach ($row in $Data) {
        $status = if ($row.Error) { "<span class='error'>Fehler</span>" } else { "OK" }
        $html += "<tr><td>$($row.SiteTitle)</td><td><a href='$($row.SiteUrl)'>$($row.SiteUrl)</a></td><td>$($row.Owner)</td><td class='numeric'>$($row.TotalFiles)</td><td class='numeric'>$($row.TotalFolders)</td><td>$status</td></tr>"
    }
    
    $html += @"
    </table>
    <footer><p>SharePoint_full_stats.ps1 v2.1 | Daniel Vollmer</p></footer>
</body>
</html>
"@
    
    $html | Out-File -FilePath $FilePath -Encoding UTF8
    Write-Host "  HTML: $FilePath" -ForegroundColor Green
}

function New-CSVReport {
    param(
        [Parameter(Mandatory = $true)] $Data,
        [Parameter(Mandatory = $true)] $FilePath
    )
    $Data | Export-Csv -Path $FilePath -Encoding UTF8 -NoTypeInformation -Delimiter ";"
    Write-Host "  CSV: $FilePath" -ForegroundColor Green
}
