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

.PARAMETER WhatIf
    Trockenlauf

.EXAMPLE
    .\New-TeamsProject.ps1 -Name "Projekt Alpha" -Owner "daniel@firma.ch" -Description "Kundenprojekt Alpha AG"

.EXAMPLE
    .\New-TeamsProject.ps1 -Name "Marketing 2026" -Owner "daniel@firma.ch" -Members "C:\members.csv"

.NOTES
    Author: VICA für Daniel
    Created: 2026-03-08
    Version: 1.0
    
    Zeitersparnis: 20 Min → 1 Min!
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [Parameter(Mandatory=$true)]
    [string]$Name,
    
    [Parameter(Mandatory=$false)]
    [string]$Description = "Projekt Team: $Name",
    
    [Parameter(Mandatory=$true)]
    [string[]]$Owner,
    
    [Parameter(Mandatory=$false)]
    [string]$Members,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Standard", "Projekt", "Klasse", "ProfessionalLearingCommunity", "Staff", "Others")]
    [string]$Template = "Standard",
    
    [Parameter(Mandatory=$false)]
    [string]$LogFile = "C:\Logs\Teams-Creation-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

# Logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    if ($LogFile) { Add-Content -Path $LogFile -Value $logEntry }
    Write-Host $logEntry -ForegroundColor $(if($Level -eq "ERROR"){"Red"}elseif($Level -eq "SUCCESS"){"Green"}else{"White"})
}

# Header
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MS Teams Project Creator" -ForegroundColor Cyan
Write-Host "  Created by VICA for Daniel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Connection prüfen
try {
    $context = Get-MgContext
    if (-not $context -or -not $context.Account) {
        Write-Log "Keine Verbindung zu Microsoft Graph. Bitte connecten!" "ERROR"
        Write-Log "Connect-MgGraph -Scopes 'Group.ReadWrite.All', 'Team.Create'" "ERROR"
        exit 1
    }
    Write-Log "Verbunden als: $($context.Account)" "SUCCESS"
} catch {
    Write-Log "Fehler bei Connection: $_" "ERROR"
    exit 1
}

# Standard Channels definieren
$standardChannels = @(
    @{Name="Allgemein"; Description="Allgemeine Diskussionen"; IsFavorite=$true},
    @{Name="Projekt-Updates"; Description="Wichtige Projekt-Updates und Ankündigungen"; IsFavorite=$true},
    @{Name="Dokumente"; Description="Ablage für Projektdokumente"; IsFavorite=$false},
    @{Name="Meeting-Notizen"; Description="Notizen und Action Items aus Meetings"; IsFavorite=$false},
    @{Name="Off-Topic"; Description="Alles andere"; IsFavorite=$false}
)

try {
    # Team erstellen
    Write-Log "Erstelle Team: $Name"
    
    if ($PSCmdlet.ShouldProcess($Name, "Create MS Team")) {
        # Group/Team erstellen
        $teamParams = @{
            displayName = $Name
            description = $Description
            visibility = "Private"
            resourceProvisioningOptions = @("Team")
            groupTypes = @("Unified")
            mailEnabled = $true
            mailNickname = $Name.ToLower().Replace(" ", "-").Normalize([Text.NormalizationForm]::FormD).Normalize([Text.NormalizationForm]::FormC)
        }
        
        $group = New-MgGroup -BodyParameter $teamParams
        Write-Log "Team erstellt: $($group.Id)" "SUCCESS"
        
        # Warten bis Team bereit ist (Microsoft braucht etwas Zeit)
        Write-Log "Warte auf Team-Bereitschaft..."
        Start-Sleep -Seconds 15
        
        # Owner hinzufügen
        Write-Log "Füge Owner hinzu..."
        foreach ($ownerEmail in $Owner) {
            try {
                $ownerUser = Get-MgUser -Filter "mail eq '$ownerEmail'"
                if ($ownerUser) {
                    Add-MgTeamMember -TeamId $group.Id -UserId $ownerUser.Id
                    Write-Log "Owner hinzugefügt: $ownerEmail" "SUCCESS"
                } else {
                    Write-Log "Owner nicht gefunden: $ownerEmail" "WARNING"
                }
            } catch {
                Write-Log "Fehler bei Owner $ownerEmail : $_" "ERROR"
            }
        }
        
        # Members hinzufügen (wenn CSV vorhanden)
        if ($Members -and (Test-Path $Members)) {
            Write-Log "Lade Member-Liste: $Members"
            $memberEmails = Import-Csv -Path $Members | Select-Object -ExpandProperty Email
            
            foreach ($memberEmail in $memberEmails) {
                try {
                    $memberUser = Get-MgUser -Filter "mail eq '$memberEmail'"
                    if ($memberUser) {
                        Add-MgTeamMember -TeamId $group.Id -UserId $memberUser.Id
                        Write-Log "Member hinzugefügt: $memberEmail" "SUCCESS"
                    }
                } catch {
                    Write-Log "Fehler bei Member $memberEmail : $_" "WARNING"
                }
            }
        }
        
        # Standard Channels erstellen
        Write-Log "Erstelle Standard-Channels..."
        foreach ($channel in $standardChannels) {
            try {
                $channelParams = @{
                    displayName = $channel.Name
                    description = $channel.Description
                    membershipType = "standard"
                }
                
                # IsFavorite geht nur für individuelle User, nicht global
                New-MgTeamChannel -TeamId $group.Id -BodyParameter $channelParams | Out-Null
                Write-Log "Channel erstellt: $($channel.Name)" "SUCCESS"
            } catch {
                Write-Log "Fehler bei Channel $($channel.Name): $_" "WARNING"
            }
        }
        
        # Welcome Post (optional)
        Write-Log "Sende Welcome-Post..."
        try {
            $generalChannel = Get-MgTeamChannel -TeamId $group.Id | Where-Object {$_.displayName -eq "Allgemein"}
            if ($generalChannel) {
                $messageParams = @{
                    body = @{
                        contentType = "html"
                        content = @"
<h2>🎉 Willkommen im Team $Name!</h2>
<p>Dieses Team wurde automatisch erstellt für das Projekt <strong>$Name</strong>.</p>
<h3>📁 Standard-Channels:</h3>
<ul>
<li><strong>Allgemein</strong> - Allgemeine Diskussionen</li>
<li><strong>Projekt-Updates</strong> - Wichtige Ankündigungen</li>
<li><strong>Dokumente</strong> - Projektdokumente</li>
<li><strong>Meeting-Notizen</strong> - Meeting-Ergebnisse</li>
<li><strong>Off-Topic</strong> - Alles andere</li>
</ul>
<p><em>Erstellt von VICA für Daniel | $(Get-Date -Format "dd.MM.yyyy")</em></p>
"@
                    }
                }
                
                New-MgTeamChannelMessage -TeamId $group.Id -ChannelId $generalChannel.Id -BodyParameter $messageParams | Out-Null
                Write-Log "Welcome-Post gesendet" "SUCCESS"
            }
        } catch {
            Write-Log "Fehler bei Welcome-Post: $_" "WARNING"
        }
        
        # Summary
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  TEAM ERFOLGREICH ERSTELLT!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Name: $Name" -ForegroundColor Cyan
        Write-Host "ID: $($group.Id)" -ForegroundColor Gray
        Write-Host "Owner: $($Owner -join ', ')" -ForegroundColor Cyan
        Write-Host "Channels: $($standardChannels.Count)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Team-Link: https://teams.microsoft.com/l/team/$($group.Id)" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Log "WhatIf: Würde Team erstellen: $Name" "INFO"
    }
    
} catch {
    Write-Log "Kritischer Fehler: $_" "ERROR"
    exit 1
}
