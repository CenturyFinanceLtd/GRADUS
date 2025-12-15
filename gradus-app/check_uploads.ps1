Add-Type -AssemblyName System.Drawing

$images = @(
    "C:\Users\dvisr\.gemini\antigravity\brain\88cad890-eb85-4009-8c62-1232b7b56bea\uploaded_image_0_1765311453472.png",
    "C:\Users\dvisr\.gemini\antigravity\brain\88cad890-eb85-4009-8c62-1232b7b56bea\uploaded_image_1_1765311453472.png"
)

foreach ($img_path in $images) {
    if (Test-Path $img_path) {
        $img = [System.Drawing.Image]::FromFile($img_path)
        Write-Host "$($img_path | Split-Path -Leaf) : $($img.Width) x $($img.Height)"
        $img.Dispose()
    } else {
        Write-Host "$($img_path) : FILE NOT FOUND"
    }
}
