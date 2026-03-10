# SharePoint_full_stats_runner.ps1
# Wrapper-Skript zum Starten von SharePoint_full_stats.ps1 ohne Profile
# Verhindert Auto-Load von PnP.PowerShell 3.x

param(
    [Parameter(Mandatory = $false)]
    [string]$SharePointAdminUrl = "https://yourtenant-admin.sharepoint.com",
    
    [Parameter(Mandatory = $false)]
    [switch]$IncludeStorageUsage,
    
    [Parameter(Mandatory = $false)]
    [switch]$IncludePermissions,
    
    [Parameter(Mandatory = $false)]
    [string]$SiteFilter
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$mainScript = Join-Path $scriptPath "SharePoint_full_stats.ps1"

Write-Host "🚀 Starte SharePoint Stats mit frischer PowerShell Session (ohne Profile)..." -ForegroundColor Green
Write-Host ""

# Starte neues PowerShell ohne Profile
$arguments = @(
    "-NoProfile",
    "-ExecutionPolicy Bypass",
    "-File `"$mainScript`"",
    "-SharePointAdminUrl `"$SharePointAdminUrl`""
)

if ($IncludeStorageUsage) { $arguments += "-IncludeStorageUsage" }
if ($IncludePermissions) { $arguments += "-IncludePermissions" }
if ($SiteFilter) { $arguments += "-SiteFilter `"$SiteFilter`"" }

& powershell.exe -ArgumentList $arguments

Write-Host ""
Write-Host "✅ Fertig!" -ForegroundColor Green
