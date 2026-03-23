param(
  [string]$OutputDir = ""
)

Add-Type -AssemblyName System.Drawing

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $PSScriptRoot "..\..\public\pwa"
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

function New-MounTrackIcon {
  param(
    [int]$Size,
    [string]$OutputPath,
    [double]$InsetRatio
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::FromArgb(8, 14, 26))

  $haloBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 18, 63, 76))
  $haloSize = [int]($Size * 0.58)
  $haloX = [int](($Size - $haloSize) / 2)
  $graphics.FillEllipse($haloBrush, $haloX, $haloX, $haloSize, $haloSize)

  $ringInset = [int]($Size * $InsetRatio)
  $ringSize = $Size - ($ringInset * 2)
  $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(52, 211, 153), [float]($Size * 0.018))
  $graphics.DrawEllipse($ringPen, $ringInset, $ringInset, $ringSize, $ringSize)

  $pulsePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(6, 182, 212), [float]($Size * 0.055))
  $pulsePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pulsePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pulsePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $points = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point([int]($Size * 0.20), [int]($Size * 0.50))),
    (New-Object System.Drawing.Point([int]($Size * 0.32), [int]($Size * 0.50))),
    (New-Object System.Drawing.Point([int]($Size * 0.39), [int]($Size * 0.37))),
    (New-Object System.Drawing.Point([int]($Size * 0.46), [int]($Size * 0.63))),
    (New-Object System.Drawing.Point([int]($Size * 0.52), [int]($Size * 0.29))),
    (New-Object System.Drawing.Point([int]($Size * 0.58), [int]($Size * 0.66))),
    (New-Object System.Drawing.Point([int]($Size * 0.65), [int]($Size * 0.44))),
    (New-Object System.Drawing.Point([int]($Size * 0.72), [int]($Size * 0.50))),
    (New-Object System.Drawing.Point([int]($Size * 0.80), [int]($Size * 0.50)))
  )
  $graphics.DrawLines($pulsePen, $points)

  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 211, 153))
  $dotSize = [int]($Size * 0.065)
  $dotX = [int](($Size * 0.52) - ($dotSize / 2))
  $dotY = [int](($Size * 0.29) - ($dotSize / 2))
  $graphics.FillEllipse($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $dotBrush.Dispose()
  $pulsePen.Dispose()
  $ringPen.Dispose()
  $haloBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-MounTrackIcon -Size 192 -OutputPath (Join-Path $OutputDir "icon-192.png") -InsetRatio 0.14
New-MounTrackIcon -Size 512 -OutputPath (Join-Path $OutputDir "icon-512.png") -InsetRatio 0.14
New-MounTrackIcon -Size 512 -OutputPath (Join-Path $OutputDir "icon-maskable-512.png") -InsetRatio 0.22
New-MounTrackIcon -Size 180 -OutputPath (Join-Path $OutputDir "apple-touch-icon.png") -InsetRatio 0.16
