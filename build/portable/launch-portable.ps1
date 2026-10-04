param([switch]$CheckRuntimeOnly)
$ErrorActionPreference = 'Stop'
function Test-WebViewRuntime {
    $client = 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    foreach ($hive in @([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryHive]::LocalMachine)) {
        foreach ($view in @([Microsoft.Win32.RegistryView]::Registry32, [Microsoft.Win32.RegistryView]::Registry64)) {
            $registry = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
            try {
                $key = $registry.OpenSubKey($client)
                if ($null -ne $key) {
                    try {
                        $version = $key.GetValue('pv')
                        if ($version -and $version -ne '0.0.0.0') { return $true }
                    } finally { $key.Dispose() }
                }
            } finally { $registry.Dispose() }
        }
    }
    return $false
}

try {
    if ($CheckRuntimeOnly) { Test-WebViewRuntime; exit 0 }
    if (!(Test-WebViewRuntime)) {
        Write-Host 'First launch: installing Microsoft WebView2 (Internet connection required)...'
        $bootstrapper = Join-Path $PSScriptRoot 'runtime\MicrosoftEdgeWebview2Setup.exe'
        $signature = Get-AuthenticodeSignature -LiteralPath $bootstrapper
        if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') {
            throw 'The Microsoft WebView2 signature is invalid. Download a fresh copy of the ZIP.'
        }
        $installation = Start-Process -FilePath $bootstrapper -ArgumentList '/silent','/install' -Wait -PassThru -WindowStyle Hidden
        if (!(Test-WebViewRuntime)) {
            throw "WebView2 could not be installed (code $($installation.ExitCode)). Check your Internet connection, then try again."
        }
    }
    Start-Process -FilePath (Join-Path $PSScriptRoot 'SeeWallpaper.App.exe') -WorkingDirectory $PSScriptRoot
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
