[CmdletBinding()]
param([string]$PortableZipPath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$testProject = Join-Path $projectRoot 'tests\SeeWallpaper.App.Tests\SeeWallpaper.App.Tests.csproj'
$runnerDirectory = Join-Path $PSScriptRoot 'desktop-check\bin\Release\net8.0-windows'
$output = Join-Path $PSScriptRoot ('functional-results\' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $output -Force | Out-Null
$variables = @('SEEWALLPAPER_FUNCTIONAL_TEST','SEEWALLPAPER_FUNCTIONAL_OUTPUT','SEEWALLPAPER_FUNCTIONAL_RUNNER')
$previous = @{}
foreach ($name in $variables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    & dotnet build $testProject --configuration Release
    if ($LASTEXITCODE -ne 0) { throw 'Functional runner build failed.' }
    $runner = Join-Path $runnerDirectory 'DesktopCheck.dll'
    if (![string]::IsNullOrWhiteSpace($PortableZipPath)) {
        $zip = (Resolve-Path -LiteralPath $PortableZipPath).Path
        $extract = Join-Path $output 'portable'
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extract)
        $apps = @(Get-ChildItem -LiteralPath $extract -Filter 'SeeWallpaper.App.dll' -Recurse -File)
        if ($apps.Count -ne 1) { throw 'Portable ZIP must contain exactly one application payload.' }
        $payload = $apps[0].Directory.FullName
        # Copy the test runner only: application/engine/runtime assemblies come from the ZIP.
        foreach ($file in @('DesktopCheck.dll','DesktopCheck.deps.json','DesktopCheck.runtimeconfig.json')) {
            Copy-Item -LiteralPath (Join-Path $runnerDirectory $file) -Destination $payload
        }
        $runner = Join-Path $payload 'DesktopCheck.dll'
        Write-Host "Testing extracted portable binaries: $payload"
    }
    $env:SEEWALLPAPER_FUNCTIONAL_TEST = '1'
    $env:SEEWALLPAPER_FUNCTIONAL_OUTPUT = $output
    $env:SEEWALLPAPER_FUNCTIONAL_RUNNER = $runner
    & dotnet test $testProject --configuration Release --no-build --filter 'FullyQualifiedName~MultiDisplayFunctionalTests' --logger 'console;verbosity=normal' --logger 'trx;LogFileName=multi-display-functional.trx' --results-directory $output
    if ($LASTEXITCODE -ne 0) { throw "Functional desktop tests failed. Reports: $output" }
    $reports = @(Get-ChildItem -LiteralPath $output -Directory | ForEach-Object {
        $reportFile = Join-Path $_.FullName 'report.json'
        if (Test-Path -LiteralPath $reportFile) { Get-Content -LiteralPath $reportFile -Raw | ConvertFrom-Json }
    })
    if ($reports.Count -ne 5 -or @($reports | Where-Object { !$_.passed }).Count -ne 0) { throw 'Missing or failed scenario reports.' }
    if (![string]::IsNullOrWhiteSpace($PortableZipPath)) {
        foreach ($report in $reports) {
            if ([IO.Path]::GetDirectoryName($report.engineAssembly) -ne $payload -or [IO.Path]::GetDirectoryName($report.applicationAssembly) -ne $payload) {
                throw 'Functional tests did not load the application and engine from the portable payload.'
            }
        }
    }
    $captureCount = ($reports | ForEach-Object { $_.checks.Count } | Measure-Object -Sum).Sum
    [pscustomobject]@{
        passed = $true
        scenarios = $reports.Count
        renderedCaptures = $captureCount
        checkedEdgePixels = $captureCount * 8
        portableZip = $PortableZipPath
        reports = @($reports | ForEach-Object { [pscustomobject]@{scenario=$_.scenario;passed=$_.passed;captures=$_.checks.Count} })
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $output 'summary.json') -Encoding utf8
    Write-Host "Functional tests passed. PNG captures, JSON reports and TRX: $output"
}
finally {
    foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}
