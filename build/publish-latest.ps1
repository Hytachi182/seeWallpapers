[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $projectRoot 'dist\latest\win-x64'

& dotnet publish (Join-Path $projectRoot 'src\SeeWallpaper.App\SeeWallpaper.App.csproj') --configuration Release --runtime win-x64 --self-contained false --output $outputPath
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed with exit code $LASTEXITCODE." }

Write-Host "Latest build available at $outputPath"
