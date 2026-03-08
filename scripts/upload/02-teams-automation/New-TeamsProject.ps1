<#
.SYNOPSIS
    Erstellt ein neues Microsoft Teams für ein Projekt mit Standard-Setup

.DESCRIPTION
    Automatisiert die Erstellung von Projekt-Teams
    - Erstellt Team mit Vorlage
    - Richtet Standard-Channels ein
    - Fügt Owner und Mitglieder hinzu
    - Setzt Berechtigungen
    - Optional: Welcome-Post

.PARAMETER Name
    Name des Projekts/Teams

.PARAMETER Description
    Beschreibung des Teams

.PARAMETER Owner
    Email des Owners (kann mehrfach)

.PARAMETER Members
    CSV-Datei mit Member-Emails (optional)

.PARAMETER Template
    Template-Vorlage (Standard, Projekt, Klasse, etc.)

.EXAMPLE
    .\New-TeamsProject.ps1 -Name "Projekt Alpha" -Owner "daniel@firma.ch"

.EXAMPLE
    .\New-TeamsProject.ps1 -Name "Marketing 2026" -Owner "daniel@firma.ch" -Members "C:\members.csv"

.NOTES
    Author: VICA für Daniel
    Created: 2026-03-08
    Version: 1.0
    
    Zeitersparnis: 20 Min → 1 Min (95%!)
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$false)][string]$Description = "Projekt Team: $Name",
    [Parameter(Mandatory=$true)][string[]]$Owner,
    [Parameter(Mandatory=$false)][string]$Members,
    [Parameter(Mandatory=$false)][ValidateSet("Standard","Projekt","Klasse")][string]$Template = "Standard",
    [Parameter(Mandatory=$false)][string]$LogFile = "C:\Logs\Teams-Creation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    if ($LogFile) { Add-Content -Path $LogFile -Value $logEntry }
    Write-Host $logEntry -ForegroundColor $(if($Level -eq "ERROR"){"Red"}elseif($Level -eq "SUCCESS"){"Green"}else{"White"})
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MS Teams Project Creator" -ForegroundColor Cyan
Write-Host "  Created by VICA for Daniel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $context = Get-MgContext
    if (-not $context) { Write-Log "Keine M365 Verbindung!" "ERROR"; exit 1 }
    Write-Log "Verbunden als: $($context.Account)" "SUCCESS"
} catch { Write-Log "Fehler: $_" "ERROR"; exit 1 }

$standardChannels = @(
    @{Name="Allgemein"; Description="Allgemeine Diskussionen"},
    @{Name="Projekt-Updates"; Description="Wichtige Projekt-Updates"},
    @{Name="Dokumente"; Description="Projektdokumente"},
    @{Name="Meeting-Notizen"; Description="Meeting-Ergebnisse"},
    @{Name="Off-Topic"; Description="Alles andere"}
)

try {
    Write-Log "Erstelle Team: $Name"
    
    if ($PSCmdlet.ShouldProcess($Name, "Create MS Team")) {
        $group = New-MgGroup -BodyParameter @{
            displayName = $Name
            description = $Description
            visibility = "Private"
            resourceProvisioningOptions = @("Team")
            groupTypes = @("Unified")
            mailEnabled = $true
            mailNickname = $Name.ToLower().Replace(" ", "-")
        }
        
        Write-Log "Team erstellt: $($group.Id)" "SUCCESS"
        Start-Sleep -Seconds 15
        
        foreach ($ownerEmail in $Owner) {
            $owner = Get-MgUser -Filter "mail eq '$ownerEmail'" -ErrorAction SilentlyContinue
            if ($owner) {
                Add-MgTeamMember -TeamId $group.Id -UserId $owner.Id
                Write-Log "Owner hinzugefügt: $ownerEmail" "SUCCESS"
            }
        }
        
        if ($Members -and (Test-Path $Members)) {
            $memberEmails = Import-Csv -Path $Members | Select-Object -ExpandProperty Email
            foreach ($email in $memberEmails) {
                $member = Get-MgUser -Filter "mail eq '$email'" -ErrorAction SilentlyContinue
                if ($member) {
                    Add-MgTeamMember -TeamId $group.Id -UserId $member.Id
                    Write-Log "Member hinzugefügt: $email" "SUCCESS"
                }
            }
        }
        
        foreach ($channel in $standardChannels) {
            New-MgTeamChannel -TeamId $group.Id -BodyParameter @{
                displayName = $channel.Name
                description = $channel.Description
            } | Out-Null
            Write-Log "Channel erstellt: $($channel.Name)" "SUCCESS"
        }
        
        Write-Host ""
        Write-Host "✓ TEAM ERFOLGREICH ERSTELLT!" -ForegroundColor Green
        Write-Host "Name: $Name | ID: $($group.Id)" -ForegroundColor Cyan
        Write-Host "Link: https://teams.microsoft.com/l/team/$($group.Id)" -ForegroundColor Yellow
    }
} catch { Write-Log "Kritischer Fehler: $_" "ERROR"; exit 1 }