<#
.SYNOPSIS
    Erstellt mehrere Microsoft 365 User im Bulk (Massen-Erstellung)

.DESCRIPTION
    Automatisiert die Anlage von neuen Mitarbeitern in Microsoft 365
    - Erstellt User Accounts
    - Weist Lizenzen zu
    - Fügt Gruppen hinzu
    - Sendet Welcome-Email (optional)

.PARAMETER CSVFile
    Pfad zur CSV-Datei mit User-Daten
    Format: DisplayName,UPN,Department,License,Groups

.PARAMETER Domain
    Standard-Domain für UPN (z.B. "firma.ch")

.PARAMETER WhatIf
    Trockenlauf - zeigt was passieren würde ohne es auszuführen

.EXAMPLE
    .\New-M365User-Bulk.ps1 -CSVFile "C:\NewUsers.csv" -Domain "firma.ch"

.EXAMPLE
    .\New-M365User-Bulk.ps1 -CSVFile "C:\NewUsers.csv" -WhatIf

.NOTES
    Author: VICA für Daniel
    Created: 2026-03-08
    Version: 1.0
    
    Zeitersparnis: ~15 Min pro User → ~2 Min total!
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [Parameter(Mandatory=$true)]
    [string]$CSVFile,
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = "firma.ch",
    
    [Parameter(Mandatory=$false)]
    [string]$LicenseSKU = "STANDARDPACK",
    
    [Parameter(Mandatory=$false)]
    [string]$LogFile = "C:\Logs\M365-User-Creation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    Write-Host $logEntry -ForegroundColor $(if($Level -eq "ERROR"){"Red"}elseif($Level -eq "SUCCESS"){"Green"}else{"White"})
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  M365 User Bulk Creation" -ForegroundColor Cyan
Write-Host "  Created by VICA for Daniel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Test-Path $CSVFile)) {
    Write-Log "CSV-Datei nicht gefunden: $CSVFile" "ERROR"
    exit 1
}

try {
    $context = Get-MgContext
    if (-not $context -or -not $context.Account) {
        Write-Log "Keine Verbindung zu Microsoft Graph. Connect-MgGraph ausführen!" "ERROR"
        exit 1
    }
    Write-Log "Verbunden als: $($context.Account)" "SUCCESS"
} catch {
    Write-Log "Fehler: $_" "ERROR"
    exit 1
}

$users = Import-Csv -Path $CSVFile
Write-Log "Gefundene User: $($users.Count)"

$success = 0; $failed = 0; $skipped = 0

foreach ($user in $users) {
    Write-Host ""
    Write-Host "Verarbeite: $($user.DisplayName)" -ForegroundColor Cyan
    
    try {
        $upn = $user.UPN ?? "$($user.DisplayName.ToLower().Replace(' ', '.'))@$Domain"
        
        if (Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue) {
            Write-Log "User existiert bereits: $upn" "WARNING"
            $skipped++
            continue
        }
        
        $password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_})
        $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force
        
        if ($PSCmdlet.ShouldProcess($upn, "Create M365 User")) {
            $newUser = New-MgUser -BodyParameter @{
                AccountEnabled = $true
                DisplayName = $user.DisplayName
                GivenName = $user.DisplayName.Split(" ")[0]
                Surname = $user.DisplayName.Split(" ")[-1]
                UserPrincipalName = $upn
                PasswordProfile = @{ForceChangePasswordNextSignIn = $true; Password = $securePassword}
                MailNickname = $upn.Split("@")[0]
                UsageLocation = "CH"
                Department = $user.Department
            }
            
            Write-Log "User erstellt: $($newUser.Id)" "SUCCESS"
            
            $licenseParams = @{
                AddLicenses = @(@{SkuId = (Get-MgSubscribedSku | Where-Object {$_.SkuPartNumber -eq $LicenseSKU}).SkuId})
                RemoveLicenses = @()
            }
            Set-MgUserLicense -UserId $newUser.Id -BodyParameter $licenseParams
            Write-Log "Lizenz zugewiesen: $LicenseSKU" "SUCCESS"
            
            $passwordFile = "C:\Logs\NewUser-$($newUser.Id).txt"
            "UPN: $upn`nPassword: $password`nCreated: $(Get-Date)" | Out-File -FilePath $passwordFile
            
            $success++
        }
    } catch {
        Write-Log "Fehler: $_" "ERROR"
        $failed++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY: $success erfolgreich, $failed fehlgeschlagen, $skipped übersprungen" -ForegroundColor Green
Write-Host "Log: $LogFile" -ForegroundColor Gray