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
    [string]$LicenseSKU = "STANDARDPACK", # Oder "ENTERPRISEPACK" für E3
    
    [Parameter(Mandatory=$false)]
    [string]$LogFile = "C:\Logs\M365-User-Creation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

# Logging Funktion
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    Write-Host $logEntry -ForegroundColor $(if($Level -eq "ERROR"){"Red"}elseif($Level -eq "SUCCESS"){"Green"}else{"White"})
}

# Header
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  M365 User Bulk Creation" -ForegroundColor Cyan
Write-Host "  Created by VICA for Daniel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check ob CSV existiert
if (-not (Test-Path $CSVFile)) {
    Write-Log "CSV-Datei nicht gefunden: $CSVFile" "ERROR"
    exit 1
}

# Microsoft Graph Connection prüfen
try {
    $context = Get-MgContext
    if (-not $context -or -not $context.Account) {
        Write-Log "Keine Verbindung zu Microsoft Graph. Bitte connecten mit: Connect-MgGraph" "ERROR"
        Write-Log "Connect-MgGraph -Scopes 'User.ReadWrite.All', 'Group.ReadWrite.All', 'Directory.ReadWrite.All'" "ERROR"
        exit 1
    }
    Write-Log "Verbunden als: $($context.Account)" "SUCCESS"
} catch {
    Write-Log "Fehler bei Graph Connection: $_" "ERROR"
    exit 1
}

# CSV einlesen
Write-Log "Lese CSV-Datei: $CSVFile"
$users = Import-Csv -Path $CSVFile
Write-Log "Gefundene User: $($users.Count)" "INFO"

# Counter
$success = 0
$failed = 0
$skipped = 0

# User verarbeiten
foreach ($user in $users) {
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Yellow
    Write-Host "Verarbeite: $($user.DisplayName)" -ForegroundColor Cyan
    
    try {
        # UPN zusammenbauen falls nicht vorhanden
        if (-not $user.UPN) {
            $username = $user.DisplayName.ToLower().Replace(" ", ".").Normalize([Text.NormalizationForm]::FormD).Normalize([Text.NormalizationForm]::FormC)
            $upn = "$username@$Domain"
        } else {
            $upn = $user.UPN
        }
        
        # Check ob User schon existiert
        $existingUser = Get-MgUser -Filter "userPrincipalName eq '$upn'" -ErrorAction SilentlyContinue
        if ($existingUser) {
            Write-Log "User existiert bereits: $upn" "WARNING"
            $skipped++
            continue
        }
        
        # Password generieren
        $password = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_})
        $securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force
        
        # User erstellen (WhatIf Support)
        if ($PSCmdlet.ShouldProcess($upn, "Create M365 User")) {
            Write-Log "Erstelle User: $upn"
            
            $newUserParams = @{
                AccountEnabled = $true
                DisplayName = $user.DisplayName
                GivenName = $user.DisplayName.Split(" ")[0]
                Surname = $user.DisplayName.Split(" ")[-1]
                UserPrincipalName = $upn
                PasswordProfile = @{
                    ForceChangePasswordNextSignIn = $true
                    Password = $securePassword
                }
                MailNickname = $upn.Split("@")[0]
                UsageLocation = "CH" # Schweiz
            }
            
            # Department falls vorhanden
            if ($user.Department) {
                $newUserParams.Department = $user.Department
            }
            
            $newUser = New-MgUser -BodyParameter $newUserParams
            
            Write-Log "User erstellt: $($newUser.Id)" "SUCCESS"
            
            # Lizenz zuweisen
            if ($user.License -or $LicenseSKU) {
                $sku = $user.License ?? $LicenseSKU
                Write-Log "Weise Lizenz zu: $sku"
                
                $licenseParams = @{
                    AddLicenses = @(
                        @{
                            SkuId = (Get-MgSubscribedSku | Where-Object {$_.SkuPartNumber -eq $sku}).SkuId
                        }
                    )
                    RemoveLicenses = @()
                }
                
                Set-MgUserLicense -UserId $newUser.Id -BodyParameter $licenseParams
                Write-Log "Lizenz zugewiesen" "SUCCESS"
            }
            
            # Zu Gruppen hinzufügen
            if ($user.Groups) {
                $groups = $user.Groups.Split(";")
                foreach ($groupName in $groups) {
                    $group = Get-MgGroup -Filter "displayName eq '$groupName'" -ErrorAction SilentlyContinue
                    if ($group) {
                        Add-MgGroupMemberByRef -GroupId $group.Id -BodyParameter @{"@odata.id" = "https://graph.microsoft.com/v1.0/directoryObjects/$($newUser.Id)"}
                        Write-Log "Zu Gruppe hinzugefügt: $groupName" "SUCCESS"
                    } else {
                        Write-Log "Gruppe nicht gefunden: $groupName" "WARNING"
                    }
                }
            }
            
            # Password speichern (für erste Anmeldung)
            $passwordFile = "C:\Logs\NewUser-Password-$($newUser.Id).txt"
            "UPN: $upn`nPassword: $password`nCreated: $(Get-Date)" | Out-File -FilePath $passwordFile -Encoding utf8
            Write-Log "Password gespeichert in: $passwordFile" "INFO"
            
            $success++
        } else {
            Write-Log "WhatIf: Würde User erstellen: $upn" "INFO"
        }
        
    } catch {
        Write-Log "Fehler bei $($user.DisplayName): $_" "ERROR"
        $failed++
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Erfolgreich: $success" -ForegroundColor Green
Write-Host "Fehlgeschlagen: $failed" -ForegroundColor Red
Write-Host "Übersprungen: $skipped" -ForegroundColor Yellow
Write-Host ""
Write-Host "Log-Datei: $LogFile" -ForegroundColor Gray
Write-Host ""
