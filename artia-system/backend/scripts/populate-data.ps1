# Script de População de Dados - Artia para Supabase
# Executa a Edge Function debug-sync sem parâmetros para popular dados

$baseUrl = "https://cjjknpbklfqdjsaxaqqc.supabase.co/functions/v1/debug-sync"
$headers = @{"Content-Type" = "application/json"}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "POPULAÇÃO DE DADOS ARTIA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Executando sincronização..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body '{}' -TimeoutSec 120
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultado:" -ForegroundColor White
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERRO" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalhes do erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os logs no Dashboard do Supabase:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/cjjknpbklfqdjsaxaqqc/logs/edge-functions" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
