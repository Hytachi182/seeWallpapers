[CmdletBinding()]
param(
    [string]$IsccPath,
    [string]$WebViewBootstrapper
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appProject = Join-Path $projectRoot 'src\SeeWallpaper.App\SeeWallpaper.App.csproj'
[xml]$projectXml = Get-Content -Raw -LiteralPath $appProject
$appVersion = [string]$projectXml.Project.PropertyGroup.Version
if ([string]::IsNullOrWhiteSpace($appVersion)) { throw 'Application Version is missing.' }
if ([string]::IsNullOrWhiteSpace($IsccPath)) {
    $candidates = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
        (Join-Path $env:TEMP 'seewallpaper-packaging-tools\inno\ISCC.exe')
    )
    $IsccPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if ([string]::IsNullOrWhiteSpace($IsccPath) -or !(Test-Path -LiteralPath $IsccPath)) {
    throw 'Install Inno Setup 6, or pass -IsccPath pointing to ISCC.exe.'
}
if ([string]::IsNullOrWhiteSpace($WebViewBootstrapper)) {
    $cacheDirectory = Join-Path $projectRoot 'build\cache'
    New-Item -ItemType Directory -Path $cacheDirectory -Force | Out-Null
    $WebViewBootstrapper = Join-Path $cacheDirectory 'MicrosoftEdgeWebview2Setup.exe'
    if (!(Test-Path -LiteralPath $WebViewBootstrapper)) {
        Invoke-WebRequest -UseBasicParsing -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $WebViewBootstrapper
    }
}
$signature = Get-AuthenticodeSignature -LiteralPath $WebViewBootstrapper
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
    throw 'WebView2 bootstrapper must have a valid Microsoft signature.'
}
& (Join-Path $PSScriptRoot 'generate-icon.ps1')
$publishDirectory = Join-Path $projectRoot 'dist\installer-payload\win-x64'
& dotnet publish $appProject --configuration Release --runtime win-x64 --self-contained true --output $publishDirectory -p:PublishTrimmed=false -p:DebugSymbols=false -p:DebugType=None
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed: $LASTEXITCODE" }
& $IsccPath /Q ("/DAppVersion=$appVersion") ("/DPublishDir=$publishDirectory") ("/DBootstrapperPath=$WebViewBootstrapper") (Join-Path $projectRoot 'installer\seeWallpaper.iss')
if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed: $LASTEXITCODE" }
$setupPath = Join-Path $projectRoot "dist\installer\seeWallpaper-Setup-$appVersion-x64.exe"
$checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $setupPath).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($setupPath + '.sha256') -Value "$checksum  $([System.IO.Path]::GetFileName($setupPath))" -Encoding ascii
Write-Host "Installer ready: $setupPath"
