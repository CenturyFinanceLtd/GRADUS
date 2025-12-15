$file = "android\gradle.properties"
$content = Get-Content $file

# Disable Hermes
$content = $content -replace "hermesEnabled=true", "hermesEnabled=false"

# Add if missing
if (-not ($content -match "hermesEnabled")) {
    $content += "hermesEnabled=false"
}

$content | Set-Content $file
Write-Host "Hermes disabled."
