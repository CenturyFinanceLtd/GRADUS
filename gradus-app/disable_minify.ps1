$file = "android\gradle.properties"
$content = Get-Content $file
$content += "enableMinifyInReleaseBuilds=false"
$content | Set-Content $file
Write-Host "Minification disabled."
