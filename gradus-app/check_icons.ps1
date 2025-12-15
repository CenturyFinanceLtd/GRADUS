Add-Type -AssemblyName System.Drawing

$icons = @(
    "assets\images\android-icon-foreground.png",
    "assets\images\app-icon.png",
    "assets\images\splash-icon.png"
)

foreach ($icon in $icons) {
    if (Test-Path $icon) {
        $img = [System.Drawing.Image]::FromFile((Resolve-Path $icon))
        Write-Host "$icon : $($img.Width) x $($img.Height)"
        $img.Dispose()
    } else {
        Write-Host "$icon : FILE NOT FOUND"
    }
}
