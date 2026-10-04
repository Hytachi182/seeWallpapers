[CmdletBinding()]
param([string]$ZipPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
[xml]$project = Get-Content -Raw (Join-Path $projectRoot 'src\SeeWallpaper.App\SeeWallpaper.App.csproj')
$version = [string]$project.Project.PropertyGroup.Version
if ([string]::IsNullOrWhiteSpace($ZipPath)) {
    $ZipPath = Join-Path $projectRoot "dist\portable\seeWallpaper-$version-Portable-x64.zip"
}
$report = [System.Collections.Generic.List[string]]::new()
function Assert-ZipCondition([bool]$Condition, [string]$Description) {
    if (!$Condition) { throw "ZIP validation failed: $Description" }
    $report.Add("PASS: $Description")
}
$expectedHash = (Get-Content -LiteralPath ($ZipPath + '.sha256') -Raw).Split(' ')[0]
Assert-ZipCondition ((Get-FileHash -LiteralPath $ZipPath).Hash -eq $expectedHash) 'SHA-256 matches the distributed archive'
$testDirectory = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) ('Temp\seeWallpaper ZIP check ' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testDirectory | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $testDirectory)
$payload = Join-Path $testDirectory "seeWallpaper-$version-x64"
foreach ($file in @('SeeWallpaper.App.exe','SeeWallpaper.App.dll','SeeWallpaper.App.deps.json','coreclr.dll','hostfxr.dll','LICENSE','LISEZ-MOI.txt','Lancer seeWallpaper.cmd','launch-portable.ps1','runtime\MicrosoftEdgeWebview2Setup.exe')) {
    Assert-ZipCondition (Test-Path -LiteralPath (Join-Path $payload $file)) "archive contains $file"
}
Assert-ZipCondition ((Get-ChildItem (Join-Path $payload 'templates') -Directory).Count -eq 13) 'all thirteen templates extracted'
foreach ($template in Get-ChildItem (Join-Path $payload 'templates') -Directory) {
    $manifest = Get-Content -LiteralPath (Join-Path $template.FullName 'manifest.json') -Raw | ConvertFrom-Json
    Assert-ZipCondition ((Test-Path (Join-Path $template.FullName $manifest.entry)) -and (Test-Path (Join-Path $template.FullName $manifest.preview))) "$($manifest.id) includes its entry and preview"
}
$metadata = [System.Diagnostics.FileVersionInfo]::GetVersionInfo((Join-Path $payload 'SeeWallpaper.App.exe'))
Assert-ZipCondition ($metadata.ProductVersion.StartsWith($version)) 'extracted executable has the release version'
$signature = Get-AuthenticodeSignature -LiteralPath (Join-Path $payload 'runtime\MicrosoftEdgeWebview2Setup.exe')
Assert-ZipCondition ($signature.Status -eq 'Valid' -and $signature.SignerCertificate.Subject -match 'O=Microsoft Corporation') 'bundled WebView2 bootstrapper has a valid Microsoft signature'
$detection = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $payload 'launch-portable.ps1') -CheckRuntimeOnly
Assert-ZipCondition ($LASTEXITCODE -eq 0 -and ($detection -eq 'True' -or $detection -eq 'False')) 'portable launcher runs from a directory containing spaces and detects the runtime without opening the app'
New-Item -ItemType Directory -Path (Join-Path $projectRoot 'build\visual-review') -Force | Out-Null
$report | Set-Content -LiteralPath (Join-Path $projectRoot 'build\visual-review\portable-validation.txt') -Encoding utf8
$report
Write-Host "ZIP validated. Extracted test copy: $payload"
