# Рисует иконки для Android во всех размерах (обычные, круглые и адаптивный передний план)
Add-Type -AssemblyName System.Drawing
$colors = @('#e8483f', '#f5c936', '#3fc3e8', '#5ac451')
$res = "$PSScriptRoot\android\app\src\main\res"

function Draw($size, $bg, $contentScale, $round, $path) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($bg) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#1f3170'))
    if ($round) { $g.FillEllipse($brush, 0, 0, $size, $size) } else { $g.FillRectangle($brush, 0, 0, $size, $size) }
  }
  $inner = $size * $contentScale
  $cell = $inner * 0.46; $gap = $inner * 0.06; $x0 = ($size - 2 * $cell - $gap) / 2
  for ($i = 0; $i -lt 4; $i++) {
    $x = $x0 + ($i % 2) * ($cell + $gap); $y = $x0 + [math]::Floor($i / 2) * ($cell + $gap)
    $c = [System.Drawing.ColorTranslator]::FromHtml($colors[$i])
    $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, [int]($c.R * .65), [int]($c.G * .65), [int]($c.B * .65)))), $x, $y, $cell, $cell)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $c), $x, $y, $cell, $cell * 0.88)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 255, 255, 255))), $x, $y, $cell, $cell * 0.12)
  }
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$dens = @{ 'mdpi' = 1; 'hdpi' = 1.5; 'xhdpi' = 2; 'xxhdpi' = 3; 'xxxhdpi' = 4 }
foreach ($d in $dens.Keys) {
  $k = $dens[$d]; $dir = "$res\mipmap-$d"
  Draw ([int](48 * $k)) $true 0.62 $false "$dir\ic_launcher.png"
  Draw ([int](48 * $k)) $true 0.55 $true "$dir\ic_launcher_round.png"
  Draw ([int](108 * $k)) $false 0.45 $false "$dir\ic_launcher_foreground.png"
}
