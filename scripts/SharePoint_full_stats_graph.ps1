# SharePoint_full_stats_graph.ps1
# ============================================================================
# Zweck: SharePoint Statistiken OHNE App Registration!
#        Nutzt Microsoft Graph SDK - funktioniert bei allen Kunden!
#
# Autor: VICA fuer Daniel Vollmer
# Datum: 2026-03-10
# Version: 1.0
# ============================================================================

param(
    [Parameter(Mandatory = $false)]
    [string]$TenantName = "yourtenant",
    
    [Parameter(Mandatory = $false)]
    [string]$ExportPath = ".\SharePoint_Stats_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
)

# ============================================================================
# CONFIGURATION
# ============================================================================
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# ============================================================================
# MODULE CHECK & INSTALL
# ============================================================================
Write-Host "Pruefe Module..." -ForegroundColor Cyan

$requiredModules = @(
    @{Name="Microsoft.Graph.Sites"; Version="2.0.0"},
    @{Name="Microsoft.Graph.Authentication"; Version="2.0.0"}
)

foreach ($mod in $requiredModules) {
    $installed = Get-Module -ListAvailable -Name $mod.Name
    if (-not $installed -or $installed.Version -lt [version]$mod.Version) {
        Write-Host "   Installiere $($mod.Name)..." -ForegroundColor Yellow
        Install-Module -Name $mod.Name -MinimumVersion $mod.Version -Force -AllowClobber -Scope CurrentUser
    }
    Import-Module -Name $mod.Name -MinimumVersion $mod.Version -Force
    Write-Host "   $($mod.Name) OK" -ForegroundColor Green
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host ""
Write-Host "Starte SharePoint Statistiken Erfassung" -ForegroundColor Green
Write-Host "   Tenant: $TenantName" -ForegroundColor Gray
Write-Host "   Export Path: $ExportPath" -ForegroundColor Gray
Write-Host ""

if (-not $TenantName) {
    $TenantName = Read-Host "Bitte Tenant Name eingeben (z.B. 'contoso' fuer contoso.sharepoint.com)"
}

$exportDir = New-Item -ItemType Directory -Path $ExportPath -Force
Write-Host "Export Directory erstellt: $($exportDir.FullName)" -ForegroundColor Green

try {
    # Connect to Microsoft Graph
    Write-Host ""
    Write-Host "Verbinde mit Microsoft Graph..." -ForegroundColor Cyan
    Write-Host "   ==> Browser oeffnet sich - mit Kunden-Credentials anmelden!" -ForegroundColor Yellow
    Write-Host ""
    
    Connect-MgGraph -Scopes "Sites.Read.All", "Sites.ReadWrite.All" -TenantId "$TenantName.onmicrosoft.com"
    
    Write-Host "   Verbunden als: $((Get-MgContext).Account)" -ForegroundColor Green
    Write-Host ""
    
    # Get all sites
    Write-Host "Lade Sites..." -ForegroundColor Cyan
    $sites = Get-MgSite -All
    
    Write-Host "   $($sites.Count) Sites gefunden" -ForegroundColor Green
    Write-Host ""
    
    # Process sites
    $allStats = @()
    $counter = 0
    
    foreach ($site in $sites) {
        $counter++
        Write-Host "[$counter/$($sites.Count)] $($site.DisplayName)" -ForegroundColor Gray
        
        $stats = @{
            SiteTitle = $site.DisplayName
            SiteUrl = $site.WebUrl
            CreatedDate = $site.CreatedDateTime
            ModifiedDate = $site.LastModifiedDateTime
            TotalFiles = 0
            TotalFolders = 0
            Error = $null
        }
        
        try {
            # Get drive (document library)
            $drive = Get-MgSiteDrive -SiteId $site.Id
            if ($drive) {
                $rootItems = Get-MgDriveRootChild -DriveId $drive.Id
                $stats.TotalFiles = ($rootItems | Where-Object { -not $_.Folder }).Count
                $stats.TotalFolders = ($rootItems | Where-Object { $_.Folder }).Count
            }
        }
        catch {
            $stats.Error = $_.Message
        }
        
        $allStats += $stats
    }
    
    # Generate reports
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
    throw
}
finally {
    Disconnect-MgGraph -ErrorAction SilentlyContinue
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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
        body { font-family: 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
        h1 { color: #0078d4; }
        table { border-collapse: collapse; width: 100%; background: white; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #0078d4; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f1f1f1; }
        .numeric { text-align: right; }
        .error { color: #d9534f; font-weight: bold; }
        .success { color: #5cb85c; }
    </style>
</head>
<body>
    <h1>SharePoint Statistiken Report</h1>
    <p>Generiert: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')</p>
    <p>Tenant: $TenantName</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Summary</h3>
        <p><strong>Sites:</strong> $totalSites | <strong>Dateien:</strong> $totalFiles | <strong>Ordner:</strong> $totalFolders</p>
    </div>
    
    <h3>Details</h3>
    <table>
        <tr>
            <th>Site Name</th>
            <th>URL</th>
            <th>Erstellt</th>
            <th>Geaendert</th>
            <th class="numeric">Dateien</th>
            <th class="numeric">Ordner</th>
            <th>Status</th>
        </tr>
"@
    
    foreach ($row in $Data) {
        $statusClass = if ($row.Error) { "error" } else { "success" }
        $statusText = if ($row.Error) { "Fehler" } else { "OK" }
        
        $created = if ($row.CreatedDate) { $row.CreatedDate.ToString('dd.MM.yyyy') } else { "N/A" }
        $modified = if ($row.ModifiedDate) { $row.ModifiedDate.ToString('dd.MM.yyyy') } else { "N/A" }
        
        $html += @"
        <tr>
            <td><strong>$($row.SiteTitle)</strong></td>
            <td><a href="$($row.SiteUrl)" target="_blank">$($row.SiteUrl)</a></td>
            <td>$created</td>
            <td>$modified</td>
            <td class="numeric">$($row.TotalFiles)</td>
            <td class="numeric">$($row.TotalFolders)</td>
            <td class="$statusText">$statusText</td>
        </tr>
"@
    }
    
    $html += @"
    </table>
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
        <p>SharePoint_full_stats_graph.ps1 v1.0 | $(Get-Date -Format 'yyyy') Daniel Vollmer</p>
    </footer>
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
