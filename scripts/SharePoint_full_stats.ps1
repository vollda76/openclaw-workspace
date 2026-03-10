# SharePoint_full_stats.ps1
# ============================================================================
# Zweck: Erfasst umfassende Statistiken aller SharePoint Online Sites
#
# Autor: VICA fuer Daniel Vollmer
# Datum: 2026-03-10
# Version: 2.0 - Mit eigener App Registration (kein Azure AD Consent Problem!)
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
# CONFIGURATION - Eigene App Registration (Multi-Tenant faehig)
# ============================================================================
$ErrorActionPreference = "Stop"
$MaxDepth = 4
$VerbosePreference = "Continue"

# Unsere eigene App Registration (kann bei ALLEN Kunden genutzt werden)
# Diese App muss NUR EINMAL im eigenen Tenant eingerichtet werden
# Kunden muessen nur "User Consent" geben (kein Admin Consent!)
$appClientId = "31359c7f-bd7e-475c-86db-fdb8c937548e"

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
    Write-Host "Verbinde mit SharePoint Admin Center..." -ForegroundColor Cyan
    
    # Extract tenant from admin URL
    $tenant = $SharePointAdminUrl -replace 'https://', '' -replace '-admin.sharepoint.com', '' -replace '.sharepoint.com', ''
    Write-Host "   Tenant: $tenant" -ForegroundColor Gray
    Write-Host "   Verwende App Client ID: $appClientId" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   ==> Bitte im Browser anmelden und zustimmen!" -ForegroundColor Yellow
    Write-Host ""
    
    # Connect mit unserer eigenen App (funktioniert bei allen Kunden!)
    Connect-PnPOnline -Url $SharePointAdminUrl -ClientId $appClientId
    
    Write-Host "Lade alle Sites..." -ForegroundColor Cyan
    $sites = Get-PnPTenantSite
    
    if ($SiteFilter) {
        $sites = $sites | Where-Object { $_.Url -like $SiteFilter -or $_.Title -like $SiteFilter }
        Write-Host "   Gefiltert auf: $SiteFilter ($($sites.Count) Sites)" -ForegroundColor Yellow
    }
    
    Write-Host "   $($sites.Count) Sites gefunden" -ForegroundColor Green
    Write-Host ""
    
    $allStats = @()
    $counter = 0
    
    foreach ($site in $sites) {
        $counter++
        Write-Host "[$counter/$($sites.Count)]" -ForegroundColor Gray -NoNewline
        $stats = Get-SiteStatistics -Site $site
        $allStats += $stats
    }
    
    Write-Host ""
    Write-Host "Generiere Reports..." -ForegroundColor Cyan
    
    $htmlPath = Join-Path $exportDir "SharePoint_Stats_Report.html"
    $csvPath = Join-Path $exportDir "SharePoint_Stats_Data.csv"
    
    New-HTMLReport -Data $allStats -FilePath $htmlPath
    New-CSVReport -Data $allStats -FilePath $csvPath
    
    $logPath = Join-Path $exportDir "SharePoint_Stats_Log.txt"
    $allStats | Where-Object { $_.Error } | Out-File -FilePath $logPath -Encoding UTF8
    Write-Host "  Log File gespeichert: $logPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Fertig! Reports verfuegbar in: $($exportDir.FullName)" -ForegroundColor Green
    Write-Host "   HTML: $htmlPath" -ForegroundColor Cyan
    Write-Host "   CSV: $csvPath" -ForegroundColor Cyan
    Write-Host "   Log: $logPath" -ForegroundColor Cyan
    
    Start-Process $htmlPath
    
}
catch {
    Write-Host "Fehler aufgetreten: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "MOEGLICHE LOESUNG:" -ForegroundColor Yellow
    Write-Host "1. Als Global Admin im Azure Portal anmelden" -ForegroundColor Gray
    Write-Host "2. Azure AD -> Enterprise Applications -> PnP PowerShell suchen" -ForegroundColor Gray
    Write-Host "3. 'Grant Admin Consent' klicken" -ForegroundColor Gray
    Write-Host "ODER:" -ForegroundColor Yellow
    Write-Host "Das Skript von GitHub aktualisieren (v2.0 mit eigener App)" -ForegroundColor Gray
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
        [Parameter(Mandatory = $true)]
        $Site
    )
    
    Write-Host "  Verarbeite Site: $($Site.Title)" -ForegroundColor Cyan
    
    $stats = @{
        SiteTitle = $Site.Title
        SiteUrl = $Site.Url
        SiteType = $Site.Template
        Owner = $Site.Owner
        CreatedDate = $Site.Created
        ModifiedDate = $Site.LastItemModifiedDate
        StorageUsedGB = $null
        TotalFolders = 0
        TotalFiles = 0
        Error = $null
    }
    
    try {
        Connect-PnPOnline -Url $Site.Url -ClientId $appClientId -ErrorAction SilentlyContinue
        
        $web = Get-PnPWeb -Includes RootFolder, Lists
        
        $lists = Get-PnPList -Includes RootFolder
        $stats.ListsCount = ($lists | Where-Object { $_.Hidden -eq $false }).Count
        $stats.LibrariesCount = ($lists | Where-Object { $_.BaseTemplate -eq 101 }).Count
        
        $rootFolder = $web.RootFolder
        $level1Stats = Get-FolderStats -Folder $rootFolder -CurrentDepth 1 -MaxDepth $MaxDepth
        
        $stats.TotalFolders = $level1Stats.FolderCount
        $stats.TotalFiles = $level1Stats.FileCount
        
    }
    catch {
        $stats.Error = $_.Exception.Message
        Write-Warning "  Fehler bei Site $($Site.Title): $_"
    }
    
    return $stats
}

function Get-FolderStats {
    param(
        [Parameter(Mandatory = $true)]
        $Folder,
        [Parameter(Mandatory = $true)]
        [int]$CurrentDepth,
        [Parameter(Mandatory = $true)]
        [int]$MaxDepth
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
    catch { Write-Warning "Fehler beim Lesen von Folder $($Folder.ServerRelativeUrl): $_" }
    
    return $stats
}

function New-HTMLReport {
    param(
        [Parameter(Mandatory = $true)] $Data,
        [Parameter(Mandatory = $true)] $FilePath
    )
    
    $html = @"
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>SharePoint Statistiken Report</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #0078d4; border-bottom: 2px solid #0078d4; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #0078d4; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f1f1f1; }
        .error { color: #d9534f; font-weight: bold; }
        .success { color: #5cb85c; }
        .numeric { text-align: right; font-family: 'Consolas', monospace; }
    </style>
</head>
<body>
    <h1>SharePoint Statistiken Report</h1>
    <p>Generiert am: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')</p>
    <p>Tenant: $SharePointAdminUrl</p>
"@
    
    $totalSites = $Data.Count
    $totalFiles = ($Data | Measure-Object -Property TotalFiles -Sum).Sum
    $totalFolders = ($Data | Measure-Object -Property TotalFolders -Sum).Sum
    
    $html += @"
    <h2>Detailuebersicht</h2>
    <table>
        <thead>
            <tr>
                <th>Site</th><th>URL</th><th>Owner</th>
                <th class="numeric">Dateien</th><th class="numeric">Ordner</th><th>Status</th>
            </tr>
        </thead>
        <tbody>
"@
    
    foreach ($row in $Data) {
        $statusClass = if ($row.Error) { "error" } else { "success" }
        $statusText = if ($row.Error) { "Fehler" } else { "OK" }
        
        $html += @"
            <tr>
                <td><strong>$($row.SiteTitle)</strong></td>
                <td><a href="$($row.SiteUrl)" target="_blank">$($row.SiteUrl)</a></td>
                <td>$($row.Owner)</td>
                <td class="numeric">$($row.TotalFiles)</td>
                <td class="numeric">$($row.TotalFolders)</td>
                <td class="$statusClass">$statusText</td>
            </tr>
"@
    }
    
    $html += @"
        </tbody>
    </table>
    <footer><p>Report generiert mit SharePoint_full_stats.ps1 v2.0 | $(Get-Date -Format 'yyyy') Daniel Vollmer</p></footer>
</body>
</html>
"@
    
    $html | Out-File -FilePath $FilePath -Encoding UTF8
    Write-Host "  HTML Report gespeichert: $FilePath" -ForegroundColor Green
}

function New-CSVReport {
    param(
        [Parameter(Mandatory = $true)] $Data,
        [Parameter(Mandatory = $true)] $FilePath
    )
    $Data | Export-Csv -Path $FilePath -Encoding UTF8 -NoTypeInformation -Delimiter ";"
    Write-Host "  CSV Export gespeichert: $FilePath" -ForegroundColor Green
}
