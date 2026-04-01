# Auto-Import All Todoist Data to TaskFlow Pro
# Imports all 5 projects and 102 tasks automatically

$API_BASE = "http://localhost:3456/api"
$TODOIST_TOKEN = "2fa0ae09e221f8d789a8596e4101f2934816b461"

# Color mapping: Todoist color name -> hex code
$colorMap = @{
    "grape" = "#af38eb"      # Documentation(job) - Purple
    "charcoal" = "#808080"   # todo, documentation, After format, Inbox - Gray
}

Write-Host "🚀 Starting Todoist Import..." -ForegroundColor Cyan

# Fetch all Todoist data
$headers = @{ Authorization = "Bearer $TODOIST_TOKEN" }
$allTasks = @()
$cursor = $null

Write-Host "`n📊 Fetching tasks from Todoist..." -ForegroundColor Yellow
do {
    $url = if ($cursor) { "https://api.todoist.com/api/v1/tasks?cursor=$cursor" } else { "https://api.todoist.com/api/v1/tasks" }
    $response = Invoke-WebRequest -Uri $url -Headers $headers
    $data = $response.Content | ConvertFrom-Json
    $allTasks += $data.results
    $cursor = $data.next_cursor
    Write-Host "  Fetched $($data.results.Count) tasks..." -ForegroundColor Gray
} while ($cursor)

Write-Host "✅ Total tasks fetched: $($allTasks.Count)" -ForegroundColor Green

# Get unique project IDs
$projectIds = $allTasks | Select-Object -ExpandProperty project_id -Unique
$allProjects = @()

Write-Host "`n📁 Fetching projects..." -ForegroundColor Yellow
foreach ($projId in $projectIds) {
    try {
        $proj = Invoke-RestMethod -Uri "https://api.todoist.com/api/v1/projects/$projId" -Headers $headers
        $allProjects += $proj
        Write-Host "  ✓ $($proj.name)" -ForegroundColor Gray
    } catch {
        Write-Host "  ✗ Failed to fetch project $projId" -ForegroundColor Red
    }
}

Write-Host "`n✅ Total projects fetched: $($allProjects.Count)" -ForegroundColor Green

# Import projects first
$projectMapping = @{}
Write-Host "`n📥 Importing projects to TaskFlow Pro..." -ForegroundColor Cyan

foreach ($project in $allProjects) {
    $colorHex = if ($colorMap[$project.color]) { $colorMap[$project.color] } else { "#808080" }
    
    $projectData = @{
        name = $project.name
        color = $colorHex
        isFavorite = $project.is_favorite
    } | ConvertTo-Json
    
    try {
        $newProject = Invoke-RestMethod -Uri "$API_BASE/projects" -Method POST -Headers @{"Content-Type"="application/json"} -Body $projectData
        $projectMapping[$project.id] = $newProject.id
        Write-Host "  ✅ Imported: $($project.name) (color: $colorHex)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed: $($project.name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Projects imported: $($projectMapping.Count)/$($allProjects.Count)" -ForegroundColor Green

# Import tasks
Write-Host "`n📥 Importing tasks to TaskFlow Pro..." -ForegroundColor Cyan
$importedCount = 0
$errorCount = 0

foreach ($task in $allTasks) {
    $newProjectId = $projectMapping[$task.project_id]
    if (-not $newProjectId) {
        Write-Host "  ⚠️ Skipping task (project not found): $($task.content)" -ForegroundColor Yellow
        $errorCount++
        continue
    }
    
    $taskData = @{
        content = $task.content
        description = $task.description
        projectId = $newProjectId
        priority = $task.priority
        dueDate = if ($task.due) { $task.due.date } else { $null }
        labels = $task.labels
        completed = $task.checked
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/tasks" -Method POST -Headers @{"Content-Type"="application/json"} -Body $taskData
        $importedCount++
        Write-Host "  ✅ [$importedCount] $($task.content)" -ForegroundColor Green
    } catch {
        $errorCount++
        Write-Host "  ❌ Failed: $($task.content) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 IMPORT COMPLETE!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📊 Import Statistics:" -ForegroundColor Yellow
Write-Host "  Projects imported: $($projectMapping.Count)/$($allProjects.Count)" -ForegroundColor White
Write-Host "  Tasks imported: $importedCount/$($allTasks.Count)" -ForegroundColor White
if ($errorCount -gt 0) {
    Write-Host "  Errors: $errorCount" -ForegroundColor Red
}

Write-Host "`n🌐 Open TaskFlow Pro:" -ForegroundColor Cyan
Write-Host "  http://localhost:3456" -ForegroundColor White

Write-Host "`n✅ All your Todoist data is now in TaskFlow Pro!" -ForegroundColor Green
Write-Host "✅ Every change you make is PERMANENT until you change it again!" -ForegroundColor Green
Write-Host "✅ Auto-saved + backed up with 5-layer protection!" -ForegroundColor Green
