Write-Output "=== AUDIT POWER & HARDWARE ==="
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

Write-Output "=== STANDBY TIMEOUT AC ==="
powercfg /q SCHEME_CURRENT SUB_SLEEP STANDBYIDLE | Select-String "Current AC Power Setting Index"

Write-Output "=== HIBERNATE TIMEOUT AC ==="
powercfg /q SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE | Select-String "Current AC Power Setting Index"

Write-Output "=== LID ACTION ==="
powercfg /q SCHEME_CURRENT SUB_BUTTONS LIDACTION | Select-String "Current AC Power Setting Index"

Write-Output "=== PENDING REBOOT ==="
$wu = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired"
$cbs = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending"
$pending = $wu -or $cbs
Write-Output "WINDOWS_PENDING_REBOOT=$pending (wu=$wu, cbs=$cbs)"

Write-Output "=== ACTIVE NETWORK ADAPTER POWER MANAGEMENT ==="
Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object {
    $name = $_.Name
    Write-Output "Adapter: $name ($($_.InterfaceDescription))"
    try {
        $pm = Get-NetAdapterPowerManagement -Name $name -ErrorAction SilentlyContinue
        if ($pm) {
            Write-Output "AllowComputerToTurnOffDevice: $($pm.AllowComputerToTurnOffDevice)"
            Write-Output "WakeOnMagicPacket: $($pm.WakeOnMagicPacket)"
        } else {
            Write-Output "Power management not supported / reported as null"
        }
    } catch {
        Write-Output "Power management query threw: $_"
    }
}
