$body = @{email="admin@sitetrack.dev"; password="Admin@123"} | ConvertTo-Json
Write-Host "=== TEST 1: Valid login ==="
try {
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:5000/api/auth/login" -ContentType "application/json" -Body $body
    Write-Host "Status: $($response.StatusCode)"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $($_.Exception.Response.StatusCode)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd()
}

Write-Host ""
Write-Host "=== TEST 2: Invalid password ==="
$badBody = @{email="admin@sitetrack.dev"; password="wrongpassword"} | ConvertTo-Json
try {
    $response2 = Invoke-WebRequest -Method POST -Uri "http://localhost:5000/api/auth/login" -ContentType "application/json" -Body $badBody
    Write-Host "Status: $($response2.StatusCode)"
    Write-Host $response2.Content
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode) - Got expected rejection"
    $stream2 = $_.Exception.Response.GetResponseStream()
    $reader2 = New-Object System.IO.StreamReader($stream2)
    Write-Host $reader2.ReadToEnd()
}
