$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
npm run installer
Write-Host ""
Write-Host "Look under src-tauri\target\release\bundle\nsis for the Windows setup executable." -ForegroundColor Green
