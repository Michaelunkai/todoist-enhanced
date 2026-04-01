# Todoist Enhanced Launcher
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Starting Todoist Enhanced..." -ForegroundColor Green
Start-Process "http://localhost:3456"
node server.js
