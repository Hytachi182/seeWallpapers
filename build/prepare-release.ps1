[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
[xml]$project = Get-Content -Raw (Join-Path $root 'src\SeeWallpaper.App\SeeWallpaper.App.csproj')
$version = [string]$project.Project.PropertyGroup.Version
$output = Join-Path $root 'dist\release'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$files = @{
    "dist\installer\seeWallpaper-Setup-$version-x64.exe" = 'seeWallpaper-Setup-x64.exe'
    "dist\portable\seeWallpaper-$version-Portable-x64.zip" = 'seeWallpaper-Portable-x64.zip'
}
$checksums = foreach ($source in $files.Keys | Sort-Object) {
    $sourcePath = Join-Path $root $source
    $checksumPath = $sourcePath + '.sha256'
    if (!(Test-Path -LiteralPath $sourcePath) -or !(Test-Path -LiteralPath $checksumPath)) { throw "Build $source first." }
    $hash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne (Get-Content -LiteralPath $checksumPath -Raw).Split(' ')[0]) { throw "Checksum mismatch: $source" }
    $target = Join-Path $output $files[$source]
    Copy-Item -LiteralPath $sourcePath -Destination $target -Force
    "$hash  $($files[$source])"
}
Set-Content -LiteralPath (Join-Path $output 'SHA256SUMS.txt') -Value $checksums -Encoding ascii
Write-Host "Release $version assets ready: $output"
