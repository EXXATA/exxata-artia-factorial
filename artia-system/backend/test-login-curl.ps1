$body = @{
    email = "andre.marquito@exxata.com.br"
    password = "factorial123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/factorial-auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing

Write-Host "Status:" $response.StatusCode
Write-Host "Response:" $response.Content
