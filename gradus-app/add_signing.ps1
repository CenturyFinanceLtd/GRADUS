$file = "android\app\build.gradle"
$content = Get-Content $file -Raw

# Add release signing config after "signingConfigs {"
$signingConfig = @"
signingConfigs {
        release {
            storeFile file("gradus-release-key.keystore")
            storePassword "gradus123"
            keyAlias "gradus-key-alias"
            keyPassword "gradus123"
        }
"@

$content = $content -replace "signingConfigs \{", $signingConfig

# Replace signingConfig signingConfigs.debug in release block with .release
# Find the release block and update
$content = $content -replace '(release\s*\{[^}]*signingConfig\s+signingConfigs\.)debug', '$1release'

$content | Set-Content $file -NoNewline
Write-Host "Signing config added successfully."
