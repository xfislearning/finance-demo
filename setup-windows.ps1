$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "Qentro Finance - dependency setup check" -ForegroundColor Cyan
Write-Host "This script does not install Visual Studio Build Tools automatically." -ForegroundColor Yellow
Write-Host ""

function Check-Cmd($name) {
  if (Get-Command $name -ErrorAction SilentlyContinue) {
    Write-Host "[OK] $name found" -ForegroundColor Green
    return $true
  } else {
    Write-Host "[MISSING] $name" -ForegroundColor Red
    return $false
  }
}

$node = Check-Cmd "node"
$npm = Check-Cmd "npm"
$rust = Check-Cmd "rustc"
$cargo = Check-Cmd "cargo"

if (-not $node) {
  Write-Host "Install Node.js LTS from https://nodejs.org/" -ForegroundColor Yellow
}
if (-not $rust) {
  Write-Host "Install Rust with: winget install --id Rustlang.Rustup" -ForegroundColor Yellow
  Write-Host "Then reopen PowerShell and run: rustup default stable-msvc" -ForegroundColor Yellow
}

Write-Host ""
if ($node -and $npm -and $rust -and $cargo) {
  Write-Host "Installing npm packages..." -ForegroundColor Cyan
  npm install
  Write-Host ""
  Write-Host "Setup complete. Run .\run-dev.ps1" -ForegroundColor Green
} else {
  Write-Host "Install the missing prerequisites, reopen PowerShell, and run this script again." -ForegroundColor Yellow
}
