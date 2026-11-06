Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path (Split-Path -Parent $root) 'FruitFilter.png'
$out = Join-Path $root 'public\icons'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($source)
$side = [Math]::Min($src.Width, $src.Height)
$srcRect = New-Object System.Drawing.Rectangle(
  [int](($src.Width - $side) / 2),
  [int](($src.Height - $side) / 2),
  $side,
  $side
)

$topColor = [System.Drawing.ColorTranslator]::FromHtml('#0745A7')
$bottomColor = [System.Drawing.ColorTranslator]::FromHtml('#071C55')

function Draw-Icon {
  param([int]$Size, [string]$Name, [double]$Fill = 1.0)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    $topColor,
    $bottomColor,
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $g.FillRectangle($brush, $rect)
  $brush.Dispose()

  $target = [int]($Size * $Fill)
  $offset = [int](($Size - $target) / 2)
  $dst = New-Object System.Drawing.Rectangle($offset, $offset, $target, $target)
  $g.DrawImage($src, $dst, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

  $bmp.Save((Join-Path $out $Name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output "wrote $Name"
}

Draw-Icon -Size 192 -Name 'icon-192-v3.png'
Draw-Icon -Size 512 -Name 'icon-512-v3.png'
Draw-Icon -Size 180 -Name 'apple-touch-icon-v3.png'
Draw-Icon -Size 512 -Name 'maskable-512-v3.png' -Fill 0.8
Draw-Icon -Size 32 -Name 'favicon-32-v3.png'
Draw-Icon -Size 16 -Name 'favicon-16-v3.png'

$src.Dispose()
