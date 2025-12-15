$file = "android\gradle.properties"
$content = Get-Content $file

# Re-enable Hermes
$content = $content -replace "hermesEnabled=false", "hermesEnabled=true"

$content | Set-Content $file
Write-Host "Hermes re-enabled."
