[CmdletBinding()]
param([string]$CompileProbe)
$ErrorActionPreference = 'Stop'
if ($CompileProbe) {
    Add-Type -OutputAssembly $CompileProbe -OutputType ConsoleApplication -TypeDefinition @'
using System;
using System.IO;
using System.Reflection;
public static class SetupProbe {
    public static void Main(string[] args) {
        File.WriteAllLines(Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "setup-arguments.txt"), args);
    }
}
'@
    return
}
$runner = Join-Path (Split-Path -Parent $PSScriptRoot) 'src\SeeWallpaper.App\UpdateRunner.ps1'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('seeWallpaper-update-test-' + [Guid]::NewGuid().ToString('N'))
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
New-Item -ItemType Directory -Path $testRoot | Out-Null
function Assert-Update([bool]$Condition, [string]$Message) {
    if (!$Condition) { throw $Message }
}
function New-Fixture([string]$Name) {
    $work = Join-Path $testRoot $Name
    $target = Join-Path $work 'app with spaces'
    $payload = Join-Path $work 'payload'
    New-Item -ItemType Directory -Path $target,$payload -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $target 'a.txt') -Value 'old'
    Set-Content -LiteralPath (Join-Path $target 'user.txt') -Value 'user data'
    Set-Content -LiteralPath (Join-Path $payload 'a.txt') -Value 'new'
    Set-Content -LiteralPath (Join-Path $payload 'new.txt') -Value 'added'
    $package = Join-Path $work 'package.zip'
    Set-Content -LiteralPath $package -Value 'verified fixture'
    $config = @{ ParentId=2147483647; Directory=$target; Payload=$payload; Package=$package; ExpectedHash=(Get-FileHash -LiteralPath $package).Hash; Installed=$false; Restart=$false }
    return @{ Work=$work; Target=$target; Payload=$payload; Config=$config }
}
function Start-Runner($Fixture) {
    $configPath = Join-Path $Fixture.Work 'update.json'
    $Fixture.Config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
    return Start-Process -FilePath $powershell -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File', ('"' + $runner + '"'), '-ConfigPath', ('"' + $configPath + '"')) -PassThru -WindowStyle Hidden
}
try {
    $success = New-Fixture 'success'
    $process = Start-Runner $success
    Assert-Update ($process.WaitForExit(15000)) 'Success helper timed out.'
    Assert-Update ($process.ExitCode -eq 0) 'Success helper failed.'
    Assert-Update ((Get-Content -LiteralPath (Join-Path $success.Target 'a.txt') -Raw).Trim() -eq 'new') 'Portable application was not updated.'
    Assert-Update ((Get-Content -LiteralPath (Join-Path $success.Target 'user.txt') -Raw).Trim() -eq 'user data') 'User files were changed.'
    Assert-Update (Test-Path -LiteralPath (Join-Path $success.Work 'backup\a.txt')) 'Backup is missing.'
    Assert-Update (Test-Path -LiteralPath (Join-Path $success.Work 'success')) 'Success marker is missing.'
    Write-Host 'PASS: portable replacement, backup and user-file preservation'

    $rollback = New-Fixture 'rollback'
    Set-Content -LiteralPath (Join-Path $rollback.Target 'zlocked.txt') -Value 'locked original'
    Set-Content -LiteralPath (Join-Path $rollback.Payload 'zlocked.txt') -Value 'replacement'
    $lock = [IO.File]::Open((Join-Path $rollback.Target 'zlocked.txt'), [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    try {
        $process = Start-Runner $rollback
        Assert-Update ($process.WaitForExit(15000)) 'Rollback helper timed out.'
        Assert-Update ($process.ExitCode -eq 1) 'Locked target did not fail safely.'
        Assert-Update ((Get-Content -LiteralPath (Join-Path $rollback.Target 'a.txt') -Raw).Trim() -eq 'old') 'Rollback did not restore overwritten files.'
        Assert-Update (!(Test-Path -LiteralPath (Join-Path $rollback.Target 'new.txt'))) 'Rollback did not remove added files.'
    } finally { $lock.Dispose() }
    Write-Host 'PASS: write failure restores old files and removes newly added files'

    $tampered = New-Fixture 'tampered'
    Set-Content -LiteralPath $tampered.Config.Package -Value 'changed after preparation'
    $process = Start-Runner $tampered
    Assert-Update ($process.WaitForExit(15000)) 'Tamper helper timed out.'
    Assert-Update ($process.ExitCode -eq 1) 'Changed package was accepted.'
    Assert-Update ((Get-Content -LiteralPath (Join-Path $tampered.Target 'a.txt') -Raw).Trim() -eq 'old') 'Changed package modified application files.'
    Write-Host 'PASS: checksum is checked again before installation'

    $waiting = New-Fixture 'parent-exit'
    $parent = Start-Process -FilePath $powershell -ArgumentList @('-NoProfile','-Command','Start-Sleep -Seconds 4') -PassThru -WindowStyle Hidden
    $waiting.Config.ParentId = $parent.Id
    $process = Start-Runner $waiting
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    while (!(Test-Path -LiteralPath (Join-Path $waiting.Work 'ready')) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 50 }
    Assert-Update (!$parent.HasExited) 'Parent fixture exited before the handshake.'
    Assert-Update ((Get-Content -LiteralPath (Join-Path $waiting.Target 'a.txt') -Raw).Trim() -eq 'old') 'Helper wrote files before parent exited.'
    Assert-Update ($process.WaitForExit(15000)) 'Parent-exit helper timed out.'
    Assert-Update ($process.ExitCode -eq 0) 'Helper did not install after parent exit.'
    Write-Host 'PASS: readiness handshake and wait for parent process exit'

    # A harmless executable records arguments; it does not install or alter registry data.
    $installed = New-Fixture 'installed'
    $fakeSetup = Join-Path $installed.Work 'setup.exe'
    # Compile using Windows PowerShell's .NET Framework compiler, also when CI calls us from pwsh.
    & $powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $PSCommandPath -CompileProbe $fakeSetup
    if ($LASTEXITCODE -ne 0) { throw 'Could not compile the harmless setup probe.' }
    $installed.Config.Installed = $true
    $installed.Config.Package = $fakeSetup
    $installed.Config.ExpectedHash = (Get-FileHash -LiteralPath $fakeSetup).Hash
    $process = Start-Runner $installed
    Assert-Update ($process.WaitForExit(15000)) 'Installer helper timed out.'
    Assert-Update ($process.ExitCode -eq 0) 'Installer helper failed.'
    $recorded = Get-Content -LiteralPath (Join-Path $installed.Work 'setup-arguments.txt')
    Assert-Update ($recorded -contains '/VERYSILENT') 'Silent installer switch missing.'
    Assert-Update ($recorded -contains '/NORESTART') 'Windows reboot suppression missing.'
    Assert-Update ($recorded -contains ('/DIR=' + $installed.Target)) 'Installation path with spaces was not preserved.'
    Assert-Update (@($recorded | Where-Object { $_ -like '/MERGETASKS=*startup*' }).Count -eq 1) 'Startup preference switch missing.'
    Write-Host 'PASS: installer handoff uses silent mode, preserves path quoting and passes startup preference'
} finally {
    # Recursive cleanup is confined to this exact generated temporary fixture directory.
    $resolved = [IO.Path]::GetFullPath($testRoot)
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\seeWallpaper-update-test-'
    if (!$resolved.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup path.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
