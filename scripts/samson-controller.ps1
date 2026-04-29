#requires -Version 5.1
<#
.SYNOPSIS
  Samson Agent Controller — PowerShell backup control for The Vault agent fleet
.DESCRIPTION
  Granular command-line interface to control The Vault AI agents.
  Requires admin JWT token from browser localStorage (admin_token).
  Functions: Samson arm/disarm, agent toggle, direct prompt, status check,
  workflow list, partnership list, boundary log, quality audit.
.NOTES
  Author: The Vault System
  Version: 1.0
#>

param(
    [string]$ApiBase = "https://thevaultdfw.win",
    [string]$Token = "",
    [string]$Action = "status",
    [string]$ProjectId = "",
    [string]$Prompt = "",
    [string]$Model = "gpt-4o",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ─── HELP ───
if ($Help) {
    @"
Samson Agent Controller — The Vault Backup Command Interface

USAGE:
  .\\samson-controller.ps1 -Action <action> [options]

ACTIONS:
  status              Show full fleet status and Samson state
  samson-arm          ARM Samson — freeze all agent operations
  samson-disarm       DISARM Samson — resume all agents
  toggle              Toggle agent on/off (-ProjectId <id>)
  prompt              Send direct prompt to agent (-ProjectId <id> -Prompt <text>)
  audit               Run quality legitimacy audit
  workflows           List active workflows
  partnerships        List partnership outreach targets
  boundaries          Show recent boundary violations
  config              Show agent configuration for -ProjectId

EXAMPLES:
  .\\samson-controller.ps1 -Action status
  .\\samson-controller.ps1 -Action samson-arm -Token "Bearer eyJ..."
  .\\samson-controller.ps1 -Action toggle -ProjectId "outreach" -Token "Bearer eyJ..."
  .\\samson-controller.ps1 -Action prompt -ProjectId "appraiser" -Prompt "Appraise a 1950 Omega Constellation" -Token "Bearer eyJ..."
  .\\samson-controller.ps1 -Action audit -Token "Bearer eyJ..."

GET TOKEN:
  1. Log in as admin at https://thevaultdfw.win/admin
  2. Open browser DevTools (F12)
  3. In Console: copy(localStorage.getItem('admin_token'))
  4. Paste token into -Token parameter
"@ | Write-Host -ForegroundColor Cyan
    exit 0
}

# ─── TOKEN VALIDATION ───
if (-not $Token) {
    Write-Host "ERROR: No token provided. Use -Token or run with -Help for instructions." -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = $Token
    "Content-Type" = "application/json"
}

# ─── HELPER: API CALL ───
function Invoke-VaultApi($Method, $Path, $Body = $null) {
    $uri = "$ApiBase/api/trpc$Path"
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 10 -Compress
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $json
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        }
        return $response.result.data
    } catch {
        Write-Host "API ERROR: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $errBody = $reader.ReadToEnd()
            Write-Host "Response: $errBody" -ForegroundColor DarkRed
        }
        return $null
    }
}

# ─── ACTION: STATUS ───
if ($Action -eq "status") {
    Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  THE VAULT — AGENT FLEET STATUS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Cyan

    $samson = Invoke-VaultApi GET "/agent.samsonStatus"
    if ($samson) {
        $color = if ($samson.armed) { "Red" } else { "Green" }
        Write-Host "  SAMSON KILL SWITCH: $($samson.message)" -ForegroundColor $color
    }

    $stats = Invoke-VaultApi GET "/agent.dashboardStats"
    if ($stats) {
        Write-Host "`n  Stats:" -ForegroundColor Yellow
        Write-Host "    Projects:        $($stats.projects)" -ForegroundColor White
        Write-Host "    Pending Tasks:   $($stats.pendingTasks)" -ForegroundColor White
        Write-Host "    Total Cycles:    $($stats.totalCycles)" -ForegroundColor White
        Write-Host "    Pass Rate:       $($stats.passRate)%" -ForegroundColor White
        Write-Host "    Total Verified:  $($stats.totalVerified)" -ForegroundColor Green
        Write-Host "    Total Failed:    $($stats.totalFailed)" -ForegroundColor $(if ($stats.totalFailed -gt 0) { "Red" } else { "Green" })
    }

    $fleet = Invoke-VaultApi GET "/agent.fleetOverview"
    if ($fleet) {
        Write-Host "`n  Fleet:" -ForegroundColor Yellow
        $fleet | ForEach-Object {
            $statusColor = if ($_.active) { "Green" } else { "DarkGray" }
            $qColor = if ($_.botPickable -gt 0) { "Yellow" } else { "DarkGray" }
            Write-Host "    [$($_.projectId.PadRight(12))] $($_.name.PadRight(20)) | Cycles:$($_.totalCycles.ToString().PadLeft(3)) | V:$($_.totalVerified) F:$($_.totalFailed) | Queue:" -NoNewline -ForegroundColor $statusColor
            Write-Host "$($_.botPickable)" -NoNewline -ForegroundColor $qColor
            Write-Host " | $($_.mode)" -ForegroundColor DarkGray
        }
    }

    $sessions = Invoke-VaultApi GET "/agent.listSessions?input=%7B%22limit%22%3A5%7D"
    if ($sessions) {
        Write-Host "`n  Recent Sessions:" -ForegroundColor Yellow
        $sessions | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.sessionId) | $($_.projectId) | $($_.totalCycles)c | $($_.status) | $($_.stopReason)" -ForegroundColor DarkGray
        }
    }

    Write-Host "`n═══════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

# ─── ACTION: SAMSON ARM ───
if ($Action -eq "samson-arm") {
    Write-Host "ARMING SAMSON..." -ForegroundColor Red
    $result = Invoke-VaultApi POST "/agent.armSamson" @{}
    if ($result) {
        Write-Host $result.message -ForegroundColor Red
        Write-Host "`nAll agents are now FROZEN." -ForegroundColor Red
        Write-Host "To resume: .\\samson-controller.ps1 -Action samson-disarm -Token `"$Token`"" -ForegroundColor Yellow
    }
}

# ─── ACTION: SAMSON DISARM ───
if ($Action -eq "samson-disarm") {
    Write-Host "DISARMING SAMSON..." -ForegroundColor Green
    $result = Invoke-VaultApi POST "/agent.disarmSamson" @{}
    if ($result) {
        Write-Host $result.message -ForegroundColor Green
    }
}

# ─── ACTION: TOGGLE ───
if ($Action -eq "toggle") {
    if (-not $ProjectId) {
        Write-Host "ERROR: -ProjectId required" -ForegroundColor Red
        exit 1
    }
    $projects = Invoke-VaultApi GET "/agent.listProjects"
    $project = $projects | Where-Object { $_.projectId -eq $ProjectId }
    if (-not $project) {
        Write-Host "ERROR: Project '$ProjectId' not found" -ForegroundColor Red
        exit 1
    }
    $newState = -not $project.active
    Write-Host "Toggling $($project.name) to $(if ($newState) { 'ACTIVE' } else { 'OFFLINE' })..." -ForegroundColor $(if ($newState) { "Green" } else { "Yellow" })
    $result = Invoke-VaultApi POST "/agent.toggleAgent" @{ projectId = $ProjectId; active = $newState }
    if ($result) {
        Write-Host "Success: $($result.projectId) is now $(if ($result.active) { 'ACTIVE' } else { 'OFFLINE' })" -ForegroundColor $(if ($result.active) { "Green" } else { "Yellow" })
    }
}

# ─── ACTION: PROMPT ───
if ($Action -eq "prompt") {
    if (-not $ProjectId -or -not $Prompt) {
        Write-Host "ERROR: -ProjectId and -Prompt required" -ForegroundColor Red
        exit 1
    }
    Write-Host "Sending prompt to $ProjectId..." -ForegroundColor Cyan
    $result = Invoke-VaultApi POST "/agent.promptAgent" @{ projectId = $ProjectId; prompt = $Prompt; model = $Model }
    if ($result) {
        if ($result.success) {
            Write-Host "`nOUTPUT (Model: $($result.model), Tokens: $($result.tokensUsed)):`" -ForegroundColor Green
            Write-Host "──────────────────────────────────────────────────" -ForegroundColor DarkGray
            Write-Host $result.output -ForegroundColor White
            Write-Host "──────────────────────────────────────────────────" -ForegroundColor DarkGray
            Write-Host "Cycle ID: $($result.cycleId)" -ForegroundColor DarkGray
        } else {
            Write-Host "FAILED: $($result.error)" -ForegroundColor Red
        }
    }
}

# ─── ACTION: AUDIT ───
if ($Action -eq "audit") {
    Write-Host "Running quality legitimacy audit..." -ForegroundColor Cyan
    $result = Invoke-VaultApi POST "/agent.runQualityAudit" @{ type = "all" }
    if ($result) {
        Write-Host "`nAUDIT COMPLETE — Overall Legitimacy: $($result.overallLegitimacy)%" -ForegroundColor $(if ($result.overallLegitimacy -ge 80) { "Green" } elseif ($result.overallLegitimacy -ge 50) { "Yellow" } else { "Red" })
        if ($result.results.appraisal) {
            Write-Host "`n  Appraisal Engine:" -ForegroundColor Yellow
            Write-Host "    Pass Rate: $($result.results.appraisal.passRate)%" -ForegroundColor White
            Write-Host "    Fake Comparable Flags: $($result.results.appraisal.fakeComparableFlags)" -ForegroundColor $(if ($result.results.appraisal.fakeComparableFlags -gt 0) { "Red" } else { "Green" })
            Write-Host "    $($result.results.appraisal.recommendation)" -ForegroundColor DarkGray
        }
        if ($result.results.buyerFinder) {
            Write-Host "`n  Buyer Finder:" -ForegroundColor Yellow
            Write-Host "    Pass Rate: $($result.results.buyerFinder.passRate)%" -ForegroundColor White
            Write-Host "    Fake Lead Flags: $($result.results.buyerFinder.fakeLeadFlags)" -ForegroundColor $(if ($result.results.buyerFinder.fakeLeadFlags -gt 0) { "Red" } else { "Green" })
            Write-Host "    $($result.results.buyerFinder.recommendation)" -ForegroundColor DarkGray
        }
    }
}

# ─── ACTION: WORKFLOWS ───
if ($Action -eq "workflows") {
    $wfs = Invoke-VaultApi GET "/workflow.list?input=%7B%22limit%22%3A20%7D"
    if ($wfs) {
        Write-Host "`nACTIVE WORKFLOWS:" -ForegroundColor Cyan
        $wfs | ForEach-Object {
            $color = if ($_.status -eq "active") { "Green" } elseif ($_.status -eq "paused") { "Yellow" } else { "DarkGray" }
            Write-Host "  [$($_.workflowId)] $($_.title) — Step $($_.currentStep)/$($_.totalSteps) — " -NoNewline
            Write-Host $_.status.ToUpper() -ForegroundColor $color
        }
    }
}

# ─── ACTION: PARTNERSHIPS ───
if ($Action -eq "partnerships") {
    $stats = Invoke-VaultApi GET "/partnership.stats"
    if ($stats) {
        Write-Host "`nPARTNERSHIP PIPELINE:" -ForegroundColor Cyan
        Write-Host "  Total: $($stats.total) | Sent: $($stats.sent) | Partners: $($stats.partners) | Draft: $($stats.draft) | Declined: $($stats.declined)" -ForegroundColor White
    }
    $targets = Invoke-VaultApi GET "/partnership.list?input=%7B%22limit%22%3A10%7D"
    if ($targets) {
        Write-Host "`n  Recent Targets:" -ForegroundColor Yellow
        $targets | Select-Object -First 10 | ForEach-Object {
            $sc = if ($_.status -eq "partner") { "Green" } elseif ($_.status -eq "sent") { "Cyan" } elseif ($_.status -eq "declined") { "Red" } else { "DarkGray" }
            Write-Host "    [$($_.status.PadRight(18))] $($_.companyName.PadRight(25)) | $($_.industry)" -ForegroundColor $sc
        }
    }
}

# ─── ACTION: BOUNDARIES ───
if ($Action -eq "boundaries") {
    $logs = Invoke-VaultApi GET "/agent.getBoundaryLog?input=%7B%22limit%22%3A20%7D"
    if ($logs) {
        Write-Host "`nBOUNDARY VIOLATIONS:" -ForegroundColor Cyan
        $logs | ForEach-Object {
            $vc = if ($_.violationType -eq "hands_off") { "Red" } elseif ($_.violationType -eq "scope_drift") { "Yellow" } else { "DarkGray" }
            Write-Host "  [$($_.violationType.PadRight(12))] $($_.projectId.PadRight(12)) | $($_.details.Substring(0, [Math]::Min(60, $_.details.Length)))" -ForegroundColor $vc
        }
        if (-not $logs) { Write-Host "  No violations recorded." -ForegroundColor Green }
    }
}

# ─── ACTION: CONFIG ───
if ($Action -eq "config") {
    if (-not $ProjectId) {
        Write-Host "ERROR: -ProjectId required" -ForegroundColor Red
        exit 1
    }
    $projects = Invoke-VaultApi GET "/agent.listProjects"
    $project = $projects | Where-Object { $_.projectId -eq $ProjectId }
    if ($project) {
        Write-Host "`nCONFIG FOR $($project.name.ToUpper()):" -ForegroundColor Cyan
        Write-Host "  Model:         $($project.model)" -ForegroundColor White
        Write-Host "  Mode:          $($project.mode)" -ForegroundColor White
        Write-Host "  Budget:        $($project.cycleBudgetMinutes)m/cycle" -ForegroundColor White
        Write-Host "  Auto-merge:    $($project.autoMerge)" -ForegroundColor White
        Write-Host "  Active:        $($project.active)" -ForegroundColor $(if ($project.active) { "Green" } else { "Red" })
        Write-Host "  Hands-off:     $($project.handsOff)" -ForegroundColor White
        Write-Host "`n  Engineer Command (first 200 chars):" -ForegroundColor Yellow
        Write-Host "  $($project.engineerCommand.Substring(0, [Math]::Min(200, $project.engineerCommand.Length)))..." -ForegroundColor DarkGray
    } else {
        Write-Host "Project not found" -ForegroundColor Red
    }
}

# ─── FALLBACK ───
if ($Action -notin @("status","samson-arm","samson-disarm","toggle","prompt","audit","workflows","partnerships","boundaries","config")) {
    Write-Host "ERROR: Unknown action '$Action'. Use -Help for available actions." -ForegroundColor Red
    exit 1
}
