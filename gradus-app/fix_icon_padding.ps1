Add-Type -AssemblyName System.Drawing

$sourcePath = "assets\images\app-icon.png"
$destPath = "assets\images\android-icon-foreground.png"

# Target Adaptive Icon Size
$canvasSize = 432

# Desired Logo Size (to fit comfortably in the 264px safe zone with padding)
# 216 is half the canvas size, leave ample room.
$logoSize = 216 

$padding = ($canvasSize - $logoSize) / 2

if (Test-Path $sourcePath) {
    $sourceImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
    
    # Create empty transparent bitmap
    $destImg = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    $graphics = [System.Drawing.Graphics]::FromImage($destImg)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Keep aspect ratio
    $ratio = $sourceImg.Width / $sourceImg.Height
    $newWidth = $logoSize
    $newHeight = $logoSize
    
    if ($sourceImg.Width -gt $sourceImg.Height) {
        $newHeight = $newWidth / $ratio
    } else {
        $newWidth = $newHeight * $ratio
    }
    
    # Center exact
    $x = ($canvasSize - $newWidth) / 2
    $y = ($canvasSize - $newHeight) / 2
    
    # Draw scaled logo
    $graphics.DrawImage($sourceImg, [int]$x, [int]$y, [int]$newWidth, [int]$newHeight)
    
    $destImg.Save((Resolve-Path .).Path + "\" + $destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destImg.Dispose()
    $sourceImg.Dispose()
    
    Write-Host "Created padded icon at $destPath"
} else {
    Write-Host "Source image not found at $sourcePath"
}
