$c = Get-Content android\app\build.gradle
for ($i=0; $i -lt $c.Count; $i++) {
    if ($c[$i] -match "release \{") {
        Write-Host "Found release block at line $i"
        for ($j=$i; $j -lt $c.Count; $j++) {
            if ($c[$j] -match "signingConfig signingConfigs.debug") {
                Write-Host "Found debug config at line $j, replacing..."
                $c[$j] = $c[$j] -replace "debug", "release"
                break
            }
        }
    }
}
$c | Set-Content android\app\build.gradle
Write-Host "Done."
