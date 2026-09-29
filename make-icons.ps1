# Рисует иконку игры (2x2 цветных кубика) в нужных размерах
Add-Type -AssemblyName System.Drawing
$colors = @('#e8483f', '#f5c936', '#3fc3e8', '#5ac451')
foreach ($size in 180, 192, 512, 1024) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#1f3170'))
  $cell = $size * 0.3; $gap = $size * 0.04; $x0 = ($size - 2 * $cell - $gap) / 2
  for ($i = 0; $i -lt 4; $i++) {
    $x = $x0 + ($i % 2) * ($cell + $gap); $y = $x0 + [math]::Floor($i / 2) * ($cell + $gap)
    $c = [System.Drawing.ColorTranslator]::FromHtml($colors[$i])
    $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, [int]($c.R * .65), [int]($c.G * .65), [int]($c.B * .65)))), $x, $y, $cell, $cell)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $c), $x, $y, $cell, $cell * 0.88)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 255, 255, 255))), $x, $y, $cell, $cell * 0.12)
  }
  $bmp.Save("$PSScriptRoot\www\icon-$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
