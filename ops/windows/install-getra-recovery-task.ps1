[CmdletBinding()]
param(
  [string]$InstallDirectory = "$env:LOCALAPPDATA\GETRA\RuntimeRecovery",
  [string]$TaskName = "GETRA Runtime Recovery"
)

$ErrorActionPreference = "Stop"
$sourceDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path $InstallDirectory | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceDirectory "getra-recover.ps1") -Destination $InstallDirectory -Force
Copy-Item -LiteralPath (Join-Path $sourceDirectory "getra-status.ps1") -Destination $InstallDirectory -Force

$recoverScript = Join-Path $InstallDirectory "getra-recover.ps1"
$eventSubscription = @'
<QueryList><Query Id="0" Path="System"><Select Path="System">*[System[Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1]]</Select></Query></QueryList>
'@
$taskService = New-Object -ComObject "Schedule.Service"
$taskService.Connect()
$rootFolder = $taskService.GetFolder("\")
$definition = $taskService.NewTask(0)
$definition.RegistrationInfo.Description =
  "Restores the existing GETRA VM and accepted runtime after logon or wake without deploying source."
$definition.Settings.Enabled = $true
$definition.Settings.Hidden = $true
$definition.Settings.StartWhenAvailable = $true
$definition.Settings.MultipleInstances = 2
$definition.Settings.ExecutionTimeLimit = "PT10M"
$definition.Settings.RestartCount = 1
$definition.Settings.RestartInterval = "PT1M"
$definition.Settings.DisallowStartIfOnBatteries = $false
$definition.Settings.StopIfGoingOnBatteries = $false

$userId = "$env:USERDOMAIN\$env:USERNAME"
$definition.Principal.UserId = $userId
$definition.Principal.LogonType = 3
$definition.Principal.RunLevel = 0

$logonTrigger = $definition.Triggers.Create(9)
$logonTrigger.Enabled = $true
$logonTrigger.UserId = $userId
$eventTrigger = $definition.Triggers.Create(0)
$eventTrigger.Enabled = $true
$eventTrigger.Subscription = $eventSubscription
$unlockTrigger = $definition.Triggers.Create(11)
$unlockTrigger.Enabled = $true
$unlockTrigger.UserId = $userId
$unlockTrigger.StateChange = 8

$action = $definition.Actions.Create(0)
$action.Path = "powershell.exe"
$action.Arguments =
  "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$recoverScript`""

$rootFolder.RegisterTaskDefinition($TaskName, $definition, 6, $null, $null, 3, $null) | Out-Null

Write-Output "GETRA_RECOVERY_TASK=$TaskName"
Write-Output "GETRA_RECOVERY_SCRIPT=$recoverScript"
Write-Output "GETRA_STATUS_SCRIPT=$(Join-Path $InstallDirectory 'getra-status.ps1')"
Write-Output "GETRA_RECOVERY_ON_BATTERY=ENABLED"
Write-Output "GETRA_RECOVERY_TRIGGERS=LOGON,POWER_RESUME,SESSION_UNLOCK"
