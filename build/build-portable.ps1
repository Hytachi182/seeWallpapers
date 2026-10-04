[CmdletBinding()]
param([string]$WebViewBootstrapper)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appProject = Join-Path $projectRoot 'src\SeeWallpaper.App\SeeWallpaper.App.csproj'
[xml]$projectXml = Get-Content -Raw -LiteralPath $appProject
$version = [string]$projectXml.Project.PropertyGroup.Version
if ([string]::IsNullOrWhiteSpace($version)) { throw 'Application Version is missing.' }
if ([string]::IsNullOrWhiteSpace($WebViewBootstrapper)) {
    $cache = Join-Path $PSScriptRoot 'cache'
    New-Item -ItemType Directory -Path $cache -Force | Out-Null
    $WebViewBootstrapper = Join-Path $cache 'MicrosoftEdgeWebview2Setup.exe'
    if (!(Test-Path -LiteralPath $WebViewBootstrapper)) {
        Invoke-WebRequest -UseBasicParsing 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $WebViewBootstrapper
    }
}
$signature = Get-AuthenticodeSignature -LiteralPath $WebViewBootstrapper
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
    throw 'WebView2 bootstrapper must have a valid Microsoft signature.'
}
& (Join-Path $PSScriptRoot 'generate-icon.ps1')
$staging = Join-Path $PSScriptRoot ('cache\portable-' + [Guid]::NewGuid().ToString('N'))
$payload = Join-Path $staging "seeWallpaper-$version-x64"
& dotnet publish $appProject --configuration Release --runtime win-x64 --self-contained true --output $payload -p:PublishTrimmed=false -p:DebugSymbols=false -p:DebugType=None
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed: $LASTEXITCODE" }
Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE') -Destination $payload
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'portable') -File | Copy-Item -Destination $payload
New-Item -ItemType Directory -Path (Join-Path $payload 'runtime') -Force | Out-Null
Copy-Item -LiteralPath $WebViewBootstrapper -Destination (Join-Path $payload 'runtime\MicrosoftEdgeWebview2Setup.exe')
$outputDirectory = Join-Path $projectRoot 'dist\portable'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$zipPath = Join-Path $outputDirectory "seeWallpaper-$version-Portable-x64.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$temporaryZip = Join-Path $outputDirectory ([Guid]::NewGuid().ToString('N') + '.zip')
[System.IO.Compression.ZipFile]::CreateFromDirectory($payload, $temporaryZip, [System.IO.Compression.CompressionLevel]::Optimal, $true)
Move-Item -LiteralPath $temporaryZip -Destination $zipPath -Force
$checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($zipPath + '.sha256') -Value "$checksum  $([System.IO.Path]::GetFileName($zipPath))" -Encoding ascii
Write-Host "ZIP ready: $zipPath"
