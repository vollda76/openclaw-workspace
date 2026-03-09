# SharePoint_full_stats.ps1
# ============================================================================
# Zweck: Erfasst umfassende Statistiken aller SharePoint Online Sites
#        inkl. Erstellungsdatum, Änderungsdatum, Datei-/Ordneranzahl bis 4 Ebenen tief
#        und generiert einen HTML-Report mit übersichtlicher Darstellung.
#
# Autor: VICA für Daniel Vollmer
# Datum: 2026-03-09
# Version: 1.0
#
# Anforderungen: PnP.PowerShell Modul, Connection zu SharePoint Online
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
    [string]$SiteFilter,  # Filter für bestimmte Sites (Wildcard-Support)
    
    [Parameter(Mandatory = $false)]
    [switch]$WhatIf  # Test-Modus ohne echte Ausführung
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$ErrorActionPreference = "Stop"
$MaxDepth = 4  # Durchsuchungstiefe für Ordner/Dateien
$VerbosePreference = "Continue"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Get-FolderStats {
    param(
        [Parameter(Mandatory = $true)]
        $Folder,
        [Parameter(Mandatory = $true)]
        [int]$CurrentDepth,
        [Parameter(Mandatory = $true)]
        [int]$MaxDepth
    )
    
    $stats = @{
        FolderCount = 0
        FileCount = 0
        Details = @()
    }
    
    if ($CurrentDepth -gt $MaxDepth) {
        return $stats
    }
    
    try {
        # Get folders and files separately
        $folders = Get-PnPFolderItem -Folder $Folder -ItemType Folder -ErrorAction SilentlyContinue
        $files = Get-PnPFolderItem -Folder $Folder -ItemType File -ErrorAction SilentlyContinue
        
        # Count folders and recurse
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
        
        # Count files
        if ($files) {
            $stats.FileCount = $files.Count
        }
    }
    catch {
        Write-Warning "Fehler beim Lesen von Folder $($Folder.ServerRelativeUrl): $_"
    }
    
    return $stats
}

function Get-SiteStatistics {
    param(
        [Parameter(Mandatory = $true)]
        $Site
    )
    
    Write-Host "  📊 Verarbeite Site: $($Site.Title)" -ForegroundColor Cyan
    
    $stats = @{
        SiteTitle = $Site.Title
        SiteUrl = $Site.Url
        SiteType = $Site.Template
        Owner = $Site.Owner
        CreatedDate = $Site.Created
        ModifiedDate = $Site.LastItemModifiedDate
        LastAccessedDate = $null  # Nicht immer verfügbar
        StorageUsedGB = $null
        TotalFolders = 0
        TotalFiles = 0
        FoldersLevel1 = 0
        FilesLevel1 = 0
        FoldersLevel2 = 0
        FilesLevel2 = 0
        FoldersLevel3 = 0
        FilesLevel3 = 0
        FoldersLevel4 = 0
        FilesLevel4 = 0
        ListsCount = 0
        LibrariesCount = 0
        UniquePermissions = $false
        ExternalSharing = $false
        Error = $null
    }
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $Site.Url -Interactive -ErrorAction SilentlyContinue
        
        # Get root web
        $web = Get-PnPWeb -Includes RootFolder, Lists
        
        # Get storage usage if requested
        if ($IncludeStorageUsage) {
            try {
                $storage = Get-PnPTenantStorageMetrics -ErrorAction SilentlyContinue
                $siteStorage = $storage | Where-Object { $_.SiteUrl -eq $Site.Url }
                $stats.StorageUsedGB = [math]::Round($siteStorage.StorageUsed / 1GB, 2)
            }
            catch {
                $stats.StorageUsedGB = "N/A"
            }
        }
        
        # Get lists and libraries
        $lists = Get-PnPList -Includes RootFolder
        $stats.ListsCount = ($lists | Where-Object { $_.Hidden -eq $false }).Count
        $stats.LibrariesCount = ($lists | Where-Object { $_.BaseTemplate -eq 101 }).Count
        
        # Get root folder stats
        $rootFolder = $web.RootFolder
        $level1Stats = Get-FolderStats -Folder $rootFolder -CurrentDepth 1 -MaxDepth $MaxDepth
        
        $stats.TotalFolders = $level1Stats.FolderCount
        $stats.TotalFiles = $level1Stats.FileCount
        $stats.FoldersLevel1 = $level1Stats.FolderCount
        $stats.FilesLevel1 = $level1Stats.FileCount
        
        # Permissions check
        if ($IncludePermissions) {
            try {
                $uniquePerms = Get-PnPList -Includes HasUniqueRoleAssignments | Where-Object { $_.HasUniqueRoleAssignments }
                $stats.UniquePermissions = $uniquePerms.Count -gt 0
            }
            catch {
                $stats.UniquePermissions = $false
            }
        }
        
        # External sharing status
        try {
            $siteSharing = Get-PnPTenantSite -Url $Site.Url -ErrorAction SilentlyContinue
            $stats.ExternalSharing = $siteSharing.SharingCapability -ne "Disabled"
        }
            catch {
            $stats.ExternalSharing = $false
        }
        
    }
    catch {
        $stats.Error = $_.Exception.Message
        Write-Warning "  ⚠️ Fehler bei Site $($Site.Title): $_"
    }
    
    return $stats
}

function New-HTMLReport {
    param(
        [Parameter(Mandatory = $true)]
        $Data,
        [Parameter(Mandatory = $true)]
        $FilePath
    )
    
    $html = @"
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SharePoint Statistiken Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #0078d4;
            border-bottom: 2px solid #0078d4;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        th {
            background-color: #0078d4;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
        }
        tr:hover {
            background-color: #f1f1f1;
        }
        .error {
            color: #d9534f;
            font-weight: bold;
        }
        .warning {
            color: #f0ad4e;
        }
        .success {
            color: #5cb85c;
        }
        .numeric {
            text-align: right;
            font-family: 'Consolas', monospace;
        }
        .summary-box {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        .summary-item {
            display: inline-block;
            margin: 10px 20px;
            padding: 15px;
            background-color: #0078d4;
            color: white;
            border-radius: 4px;
            min-width: 150px;
            text-align: center;
        }
        .summary-number {
            font-size: 24px;
            font-weight: bold;
        }
        .summary-label {
            font-size: 12px;
            opacity: 0.9;
        }
        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>📊 SharePoint Statistiken Report</h1>
    <p>Generiert am: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')</p>
    <p>Tenant: $SharePointAdminUrl</p>
"@
    
    # Summary Box
    $totalSites = $Data.Count
    $totalFiles = ($Data | Measure-Object -Property TotalFiles -Sum).Sum
    $totalFolders = ($Data | Measure-Object -Property TotalFolders -Sum).Sum
    $totalStorage = ($Data | Where-Object { $_.StorageUsedGB -is [double] } | Measure-Object -Property StorageUsedGB -Sum).Sum
    
    $html += @"
    <div class="summary-box">
        <div class="summary-item">
            <div class="summary-number">$totalSites</div>
            <div class="summary-label">Sites gesamt</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">$totalFiles</div>
            <div class="summary-label">Dateien gesamt</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">$totalFolders</div>
            <div class="summary-label">Ordner gesamt</div>
        </div>
        <div class="summary-item">
            <div class="summary-number">$([math]::Round($totalStorage, 2)) GB</div>
            <div class="summary-label">Storage genutzt</div>
        </div>
    </div>
"@
    
    # Detail Table
    $html += @"
    <h2>📋 Detailübersicht aller Sites</h2>
    <table>
        <thead>
            <tr>
                <th>Site Name</th>
                <th>URL</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Erstellt</th>
                <th>Geändert</th>
                <th class="numeric">Dateien</th>
                <th class="numeric">Ordner</th>
                <th class="numeric">Level 1</th>
                <th class="numeric">Level 2</th>
                <th class="numeric">Level 3</th>
                <th class="numeric">Level 4</th>
                <th class="numeric">Storage (GB)</th>
                <th>Sharing</th>
                <th>Unique Perms</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
"@
    
    foreach ($row in $Data) {
        $statusClass = if ($row.Error) { "error" } elseif ($row.ExternalSharing) { "warning" } else { "success" }
        $statusText = if ($row.Error) { "⚠️ Fehler" } elseif ($row.ExternalSharing) { "⚠️ Extern" } else { "✅ OK" }
        
        $sharingText = if ($row.ExternalSharing) { "Ja ⚠️" } else { "Nein" }
        $permsText = if ($row.UniquePermissions) { "Ja ⚠️" } else { "Nein" }
        
        $html += @"
            <tr>
                <td><strong>$($row.SiteTitle)</strong></td>
                <td><a href="$($row.SiteUrl)" target="_blank">$($row.SiteUrl)</a></td>
                <td>$($row.SiteType)</td>
                <td>$($row.Owner)</td>
                <td>$(if ($row.CreatedDate) { $row.CreatedDate.ToString('dd.MM.yyyy') } else { "N/A" })</td>
                <td>$(if ($row.ModifiedDate) { $row.ModifiedDate.ToString('dd.MM.yyyy') } else { "N/A" })</td>
                <td class="numeric">$($row.TotalFiles)</td>
                <td class="numeric">$($row.TotalFolders)</td>
                <td class="numeric">F: $($row.FoldersLevel1)<br>D: $($row.FilesLevel1)</td>
                <td class="numeric">F: $($row.FoldersLevel2)<br>D: $($row.FilesLevel2)</td>
                <td class="numeric">F: $($row.FoldersLevel3)<br>D: $($row.FilesLevel3)</td>
                <td class="numeric">F: $($row.FoldersLevel4)<br>D: $($row.FilesLevel4)</td>
                <td class="numeric">$(if ($row.StorageUsedGB -is [double]) { $row.StorageUsedGB } else { "N/A" })</td>
                <td>$sharingText</td>
                <td>$permsText</td>
                <td class="$statusClass">$statusText</td>
            </tr>
"@
    }
    
    $html += @"
        </tbody>
    </table>
    
    <footer>
        <p>Report generiert mit SharePoint_full_stats.ps1 v1.0 | $(Get-Date -Format 'yyyy') Daniel Vollmer</p>
        <p>⚠️ Hinweis: Last Accessed Date ist nicht immer verfügbar (abhängig von Audit-Logging)</p>
    </footer>
</body>
</html>
"@
    
    $html | Out-File -FilePath $FilePath -Encoding UTF8
    Write-Host "  ✅ HTML Report gespeichert: $FilePath" -ForegroundColor Green
}

function New-CSVReport {
    param(
        [Parameter(Mandatory = $true)]
        $Data,
        [Parameter(Mandatory = $true)]
        $FilePath
    )
    
    $Data | Export-Csv -Path $FilePath -Encoding UTF8 -NoTypeInformation -Delimiter ";"
    Write-Host "  ✅ CSV Export gespeichert: $FilePath" -ForegroundColor Green
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "🚀 Starte SharePoint Statistiken Erfassung" -ForegroundColor Green
Write-Host "   Max Depth: $MaxDepth Ebenen" -ForegroundColor Gray
Write-Host "   Export Path: $ExportPath" -ForegroundColor Gray
Write-Host ""

if ($WhatIf) {
    Write-Host "⚠️ WHATIF MODE - Keine echte Ausführung" -ForegroundColor Yellow
    return
}

# Create export directory
$exportDir = New-Item -ItemType Directory -Path $ExportPath -Force
Write-Host "📁 Export Directory erstellt: $($exportDir.FullName)" -ForegroundColor Green

try {
    # Connect to SharePoint Admin
    Write-Host "🔗 Verbinde mit SharePoint Admin Center..." -ForegroundColor Cyan
    Connect-PnPOnline -Url $SharePointAdminUrl -Interactive
    
    # Get all sites
    Write-Host "📋 Lade alle Sites..." -ForegroundColor Cyan
    $sites = Get-PnPTenantSite
    
    if ($SiteFilter) {
        $sites = $sites | Where-Object { $_.Url -like $SiteFilter -or $_.Title -like $SiteFilter }
        Write-Host "   Gefiltert auf: $SiteFilter ($($sites.Count) Sites)" -ForegroundColor Yellow
    }
    
    Write-Host "   $($sites.Count) Sites gefunden" -ForegroundColor Green
    Write-Host ""
    
    # Process each site
    $allStats = @()
    $counter = 0
    
    foreach ($site in $sites) {
        $counter++
        Write-Host "[$counter/$($sites.Count)]" -ForegroundColor Gray -NoNewline
        $stats = Get-SiteStatistics -Site $site
        $allStats += $stats
    }
    
    # Generate reports
    Write-Host ""
    Write-Host "💾 Generiere Reports..." -ForegroundColor Cyan
    
    $htmlPath = Join-Path $exportDir "SharePoint_Stats_Report.html"
    $csvPath = Join-Path $exportDir "SharePoint_Stats_Data.csv"
    
    New-HTMLReport -Data $allStats -FilePath $htmlPath
    New-CSVReport -Data $allStats -FilePath $csvPath
    
    # Create log file
    $logPath = Join-Path $exportDir "SharePoint_Stats_Log.txt"
    $allStats | Where-Object { $_.Error } | Out-File -FilePath $logPath -Encoding UTF8
    Write-Host "  📝 Log File gespeichert: $logPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✅ Fertig! Reports verfügbar in: $($exportDir.FullName)" -ForegroundColor Green
    Write-Host "   📄 HTML: $htmlPath" -ForegroundColor Cyan
    Write-Host "   📊 CSV: $csvPath" -ForegroundColor Cyan
    Write-Host "   📝 Log: $logPath" -ForegroundColor Cyan
    
    # Open HTML report
    Start-Process $htmlPath
    
}
catch {
    Write-Host "❌ Fehler aufgetreten: $_" -ForegroundColor Red
    throw
}
finally {
    Disconnect-PnPOnline -ErrorAction SilentlyContinue
}
