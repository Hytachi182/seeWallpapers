[CmdletBinding()]
param([string]$SetupPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($SetupPath)) {
    [xml]$appProject = Get-Content -Raw (Join-Path $projectRoot 'src\SeeWallpaper.App\SeeWallpaper.App.csproj')
    $version = [string]$appProject.Project.PropertyGroup.Version
    $SetupPath = Join-Path $projectRoot "dist\installer\seeWallpaper-Setup-$version-x64.exe"
}
$uninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{385BAC45-067C-486E-A288-CC1BE0D4D072}_is1'
$contextKey = 'HKCU:\Software\Classes\DesktopBackground\Shell\seeWallpaper'
$classKey = 'HKCU:\Software\Classes\seeWallpaper.Template'
$extensionKey = 'HKCU:\Software\Classes\.seewall'
$startupKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$desktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'seeWallpaper.lnk'
$menuDirectory = Join-Path ([Environment]::GetFolderPath('Programs')) 'seeWallpaper'
foreach ($existing in @($uninstallKey,$contextKey,$classKey,$desktopShortcut,$menuDirectory)) {
    if (Test-Path -LiteralPath $existing) { throw "Installer test refuses to replace an existing installation or integration: $existing" }
}
if ((Get-ItemProperty -LiteralPath $startupKey -Name 'seeWallpaper' -ErrorAction SilentlyContinue)) {
    throw 'Installer test refuses to replace an existing startup entry.'
}
$originalAssociation = if (Test-Path -LiteralPath $extensionKey) { (Get-Item -LiteralPath $extensionKey).GetValue('') } else { $null }
$testDirectory = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) ('Temp\seeWallpaper-installer-test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testDirectory | Out-Null
$testApplication = Join-Path $testDirectory 'app with spaces'
$report = [System.Collections.Generic.List[string]]::new()
function Assert-InstallerCondition([bool]$Condition, [string]$Description) {
    if (!$Condition) { throw "Installer validation failed: $Description" }
    $report.Add("PASS: $Description")
}
function Invoke-TestSetup([string]$Tasks, [string]$LogName) {
    $arguments = @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/LANG=french',('/DIR="' + $testApplication + '"'),('/TASKS="' + $Tasks + '"'),('/LOG="' + (Join-Path $testDirectory $LogName) + '"'))
    $process = Start-Process -FilePath $SetupPath -ArgumentList $arguments -PassThru -Wait -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw "Setup exited with $($process.ExitCode). Log: $testDirectory" }
}
try {
    Invoke-TestSetup 'desktopicon,contextmenu,fileassociation,startup' 'install.log'
    Assert-InstallerCondition (Test-Path (Join-Path $testApplication 'SeeWallpaper.App.exe')) 'application installed'
    Assert-InstallerCondition (Test-Path (Join-Path $testApplication 'coreclr.dll')) 'self-contained .NET runtime installed'
    Assert-InstallerCondition ((Get-ChildItem (Join-Path $testApplication 'templates') -Directory).Count -eq 13) 'all thirteen templates installed'
    Assert-InstallerCondition (Test-Path $desktopShortcut) 'desktop shortcut created'
    Assert-InstallerCondition ((Get-ChildItem $menuDirectory -Filter '*.lnk').Count -eq 3) 'Start menu app, displays and uninstall shortcuts created'
    $shell = New-Object -ComObject WScript.Shell
    Assert-InstallerCondition ($shell.CreateShortcut($desktopShortcut).TargetPath -eq (Join-Path $testApplication 'SeeWallpaper.App.exe')) 'desktop shortcut targets installed application'
    $contextCommand = (Get-Item -LiteralPath ($contextKey + '\command')).GetValue('')
    Assert-InstallerCondition ($contextCommand -eq ('"' + (Join-Path $testApplication 'SeeWallpaper.App.exe') + '" --screens')) 'context menu uses quoted display-management command'
    $importCommand = (Get-Item -LiteralPath ($classKey + '\shell\open\command')).GetValue('')
    Assert-InstallerCondition ($importCommand -eq ('"' + (Join-Path $testApplication 'SeeWallpaper.App.exe') + '" --import "%1"')) 'file association quotes the package path'
    Assert-InstallerCondition (Test-Path $uninstallKey) 'Windows uninstall registration created'
    Assert-InstallerCondition ((Get-ItemProperty -LiteralPath $uninstallKey).Publisher -eq 'Michael Ruffenach') 'Windows application publisher credits Michael Ruffenach'
    Assert-InstallerCondition ([bool](Get-ItemProperty -LiteralPath $startupKey -Name 'seeWallpaper')) 'optional login startup entry created'

    Invoke-TestSetup '' 'update-without-options.log'
    Assert-InstallerCondition (!(Test-Path $contextKey)) 'update removes deselected context menu'
    Assert-InstallerCondition (!(Test-Path $classKey)) 'update removes deselected file association'
    Assert-InstallerCondition (!(Test-Path $desktopShortcut)) 'update removes deselected desktop shortcut'
    Assert-InstallerCondition (!(Get-ItemProperty -LiteralPath $startupKey -Name 'seeWallpaper' -ErrorAction SilentlyContinue)) 'update removes deselected startup option'

    Invoke-TestSetup 'desktopicon,contextmenu,fileassociation' 'update-with-options.log'
    Assert-InstallerCondition (!(Get-ItemProperty -LiteralPath $startupKey -Name 'seeWallpaper' -ErrorAction SilentlyContinue)) 'login startup remains opt-in'
} finally {
    $uninstaller = Join-Path $testApplication 'unins000.exe'
    if (Test-Path $uninstaller) {
        $installedLocation = (Get-ItemProperty -LiteralPath $uninstallKey).InstallLocation.TrimEnd('\')
        if ($installedLocation -ne $testApplication.TrimEnd('\')) { throw 'Refusing to uninstall: InstallLocation differs from the test directory.' }
        $arguments = @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART',('/LOG="' + (Join-Path $testDirectory 'uninstall.log') + '"'))
        $process = Start-Process -FilePath $uninstaller -ArgumentList $arguments -PassThru -Wait -WindowStyle Hidden
        if ($process.ExitCode -ne 0) { throw "Uninstaller exited with $($process.ExitCode)." }
    }
}
Assert-InstallerCondition (!(Test-Path (Join-Path $testApplication 'SeeWallpaper.App.exe'))) 'uninstall removes application files'
Assert-InstallerCondition (!(Test-Path $uninstallKey)) 'uninstall removes Windows application registration'
Assert-InstallerCondition (!(Test-Path $contextKey)) 'uninstall removes context menu'
Assert-InstallerCondition (!(Test-Path $classKey)) 'uninstall removes package ProgID'
Assert-InstallerCondition (!(Test-Path $desktopShortcut)) 'uninstall removes desktop shortcut'
Assert-InstallerCondition (!(Test-Path $menuDirectory)) 'uninstall removes Start menu shortcuts'
$finalAssociation = if (Test-Path -LiteralPath $extensionKey) { (Get-Item -LiteralPath $extensionKey).GetValue('') } else { $null }
Assert-InstallerCondition ($finalAssociation -eq $originalAssociation) 'pre-existing extension default is preserved'
$reportPath = Join-Path $projectRoot 'build\visual-review\installer-validation.txt'
$report | Set-Content -LiteralPath $reportPath -Encoding utf8
$report
Write-Host "Installer lifecycle validated. Logs: $testDirectory"
