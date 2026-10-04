[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore,WindowsBase
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $projectRoot 'assets'
New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
$bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
$bitmap.BeginInit()
$bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
$bitmap.UriSource = [Uri](Join-Path $projectRoot 'seewallpaper.png')
$bitmap.EndInit()
$bitmap.Freeze()
$sizes = @(16,24,32,48,64,128,256)
$images = @()
foreach ($size in $sizes) {
    $visual = New-Object System.Windows.Media.DrawingVisual
    $drawing = $visual.RenderOpen()
    $drawing.DrawImage($bitmap, [System.Windows.Rect]::new(0,0,$size,$size))
    $drawing.Close()
    $render = [System.Windows.Media.Imaging.RenderTargetBitmap]::new($size,$size,96,96,[System.Windows.Media.PixelFormats]::Pbgra32)
    $render.Render($visual)
    $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
    $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($render))
    $stream = New-Object System.IO.MemoryStream
    $encoder.Save($stream)
    $images += ,$stream.ToArray()
    $stream.Dispose()
}
$iconPath = Join-Path $assetDirectory 'seewallpaper.ico'
$writer = [System.IO.BinaryWriter]::new([System.IO.File]::Create($iconPath))
try {
    $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($index = 0; $index -lt $sizes.Count; $index++) {
        $dimension = if ($sizes[$index] -eq 256) { 0 } else { $sizes[$index] }
        $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
        $writer.Write([byte]0); $writer.Write([byte]0)
        $writer.Write([uint16]1); $writer.Write([uint16]32)
        $writer.Write([uint32]$images[$index].Length); $writer.Write([uint32]$offset)
        $offset += $images[$index].Length
    }
    foreach ($imageBytes in $images) { $writer.Write([byte[]]$imageBytes) }
} finally { $writer.Dispose() }
Write-Host "Generated $iconPath (16-256 px)"
