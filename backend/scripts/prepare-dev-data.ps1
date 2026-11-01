param([ValidateSet('dev')][string]$Profile = 'dev')
$ErrorActionPreference = 'Stop'
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
# Explicit maintenance command: normal dev startup never invokes this file.
$driver = Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE '.m2/repository/com/h2database/h2') -Filter 'h2-*.jar' -Recurse |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $driver) { throw 'H2 driver not found. Build/start backend once first.' }
& java '-Dfile.encoding=UTF-8' -cp $driver.FullName (Join-Path $PSScriptRoot 'PrepareDevData.java') $Profile $backendRoot
if ($LASTEXITCODE -ne 0) { throw "Dev data preparation failed (exit $LASTEXITCODE). Check the error above; no success should be assumed." }
