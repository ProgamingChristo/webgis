[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$service=New-Object -ComObject 'Schedule.Service';$service.Connect();$root=$service.GetFolder('\');$userId="$env:USERDOMAIN\$env:USERNAME"
function New-Definition([string]$Description,[string]$Arguments,[string]$Limit){$d=$service.NewTask(0);$d.RegistrationInfo.Description=$Description;$d.Settings.Enabled=$true;$d.Settings.Hidden=$true;$d.Settings.StartWhenAvailable=$true;$d.Settings.MultipleInstances=2;$d.Settings.ExecutionTimeLimit=$Limit;$d.Settings.RestartCount=1;$d.Settings.RestartInterval='PT1M';$d.Settings.DisallowStartIfOnBatteries=$false;$d.Settings.StopIfGoingOnBatteries=$false;$d.Principal.UserId=$userId;$d.Principal.LogonType=3;$d.Principal.RunLevel=0;$a=$d.Actions.Create(0);$a.Path='powershell.exe';$a.Arguments=$Arguments;$a.WorkingDirectory='D:\Getra_Production\ops';return $d}
$startup=New-Definition 'GETRA judging startup/recovery after logon, resume, unlock, or network reconnect.' '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Getra_Production\ops\start-getra-judging.ps1" -AllowVmReset' 'PT8M'
$logon=$startup.Triggers.Create(9);$logon.Enabled=$true;$logon.UserId=$userId
$unlock=$startup.Triggers.Create(11);$unlock.Enabled=$true;$unlock.UserId=$userId;$unlock.StateChange=8
$resume=$startup.Triggers.Create(0);$resume.Enabled=$true;$resume.Subscription="<QueryList><Query Id='0' Path='System'><Select Path='System'>*[System[Provider[@Name='Microsoft-Windows-Power-Troubleshooter'] and EventID=1]]</Select></Query></QueryList>"
$network=$startup.Triggers.Create(0);$network.Enabled=$true;$network.Subscription="<QueryList><Query Id='0' Path='Microsoft-Windows-NetworkProfile/Operational'><Select Path='Microsoft-Windows-NetworkProfile/Operational'>*[System[(EventID=10000)]]</Select></Query></QueryList>"
$root.RegisterTaskDefinition('GETRA-Judging-Startup',$startup,6,$null,$null,3,$null)|Out-Null
$watch=New-Definition 'GETRA layered two-minute health watch with failure threshold and cooldown.' '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Getra_Production\ops\recover-getra-judging.ps1" -HealthWatch' 'PT4M'
$time=$watch.Triggers.Create(2);$time.Enabled=$true;$time.DaysInterval=1;$time.StartBoundary=(Get-Date).AddMinutes(2).ToString("yyyy-MM-dd'T'HH':'mm':'ss",[Globalization.CultureInfo]::InvariantCulture);$time.Repetition.Interval='PT2M';$time.Repetition.Duration='P1D';$time.Repetition.StopAtDurationEnd=$false
$root.RegisterTaskDefinition('GETRA-Judging-Health-Watch',$watch,6,$null,$null,3,$null)|Out-Null
Write-Output 'GETRA-Judging-Startup=REGISTERED';Write-Output 'GETRA-Judging-Health-Watch=REGISTERED';Write-Output 'OVERLAP_POLICY=IGNORE_NEW';Write-Output 'HEALTH_INTERVAL=PT2M'
