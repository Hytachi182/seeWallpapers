param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference = 'Stop'
$work = Split-Path -Parent $ConfigPath
$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$target = [IO.Path]::GetFullPath($config.Directory).TrimEnd('\')
$executable = Join-Path $target 'SeeWallpaper.App.exe'
$changes = [Collections.Generic.List[object]]::new()
$log = Join-Path $work 'update.log'
try {
    # Acquire the process handle before signalling readiness; PID reuse cannot confuse the wait.
    $parent = Get-Process -Id $config.ParentId -ErrorAction SilentlyContinue
    if ($parent) { $null = $parent.Handle }
    Set-Content -LiteralPath (Join-Path $work 'ready') -Value 'ready'
    if ($parent -and !$parent.WaitForExit(120000)) { throw 'The application did not exit; no files were changed.' }
    if ((Get-FileHash -LiteralPath $config.Package -Algorithm SHA256).Hash -ne $config.ExpectedHash) { throw 'Update checksum changed.' }
    if ($config.Installed) {
        $startup = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'seeWallpaper' -ErrorAction SilentlyContinue
        $startupTask = if ($startup) { '/MERGETASKS="startup"' } else { '/MERGETASKS="!startup"' }
        $arguments = @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/SP-', $startupTask, ('/DIR="' + $target + '"'), ('/LOG="' + (Join-Path $work 'setup.log') + '"'))
        $setup = Start-Process -FilePath $config.Package -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
        if ($setup.ExitCode -ne 0) { throw "Installer failed with exit code $($setup.ExitCode)." }
    } else {
        $payload = [IO.Path]::GetFullPath($config.Payload).TrimEnd('\')
        if (!$payload.StartsWith($work + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Payload is outside the update workspace.' }
        # Save each overwritten file before replacing it. Keep unrelated portable files intact.
        foreach ($file in Get-ChildItem -LiteralPath $payload -Recurse -File) {
            if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked payload files are not supported.' }
            $relative = $file.FullName.Substring($payload.Length + 1)
            $destination = [IO.Path]::GetFullPath((Join-Path $target $relative))
            if (!$destination.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe destination.' }
            $ancestor = Split-Path -Parent $destination
            while ($ancestor.Length -ge $target.Length) {
                if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked destination directories are not supported.' }
                $ancestor = Split-Path -Parent $ancestor
            }
            if ((Test-Path -LiteralPath $destination) -and ((Get-Item -LiteralPath $destination).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked destination files are not supported.' }
            $backup = $null
            if (Test-Path -LiteralPath $destination) {
                $backup = Join-Path (Join-Path $work 'backup') $relative
                New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
                Copy-Item -LiteralPath $destination -Destination $backup
            }
            $changes.Add(@{ Destination=$destination; Backup=$backup })
            New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
            Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
        }
    }
    Set-Content -LiteralPath $log -Value 'Update installed successfully.'
    if ($config.Restart) { Start-Process -FilePath $executable -WorkingDirectory $target -WindowStyle Normal }
    Set-Content -LiteralPath (Join-Path $work 'success') -Value 'success'
} catch {
    $failure = $_.Exception.ToString()
    for ($index = $changes.Count - 1; $index -ge 0; $index--) {
        $change = $changes[$index]
        try {
            if ($change.Backup) { Copy-Item -LiteralPath $change.Backup -Destination $change.Destination -Force }
            elseif (Test-Path -LiteralPath $change.Destination) { Remove-Item -LiteralPath $change.Destination -Force }
        } catch { $failure += "`r`nRollback: $($_.Exception.Message)" }
    }
    Set-Content -LiteralPath $log -Value $failure
    if ($config.Restart) {
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show(($config.FailureMessage + "`r`n" + $log), $config.FailureTitle) | Out-Null
        # If the parent never exited, do not launch a second instance.
        if (!$parent -or $parent.HasExited) { Start-Process -FilePath $executable -WorkingDirectory $target -WindowStyle Normal }
    }
    exit 1
}
