# Script de PowerShell para iniciar el API Gateway con el módulo de clima
Write-Host "🚀 Iniciando API Gateway con integración del módulo de clima..." -ForegroundColor Green

# Verificar si Node.js está instalado
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js no está instalado. Por favor instala Node.js primero." -ForegroundColor Red
    exit 1
}

# Verificar si npm está disponible
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm no está disponible. Por favor instala npm primero." -ForegroundColor Red
    exit 1
}

# Cambiar al directorio del API Gateway
Set-Location "c:\Users\micha\Desktop\Aws\Api_Gateway"

Write-Host "📦 Instalando dependencias del API Gateway..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error instalando dependencias" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Compilando TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando TypeScript" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Iniciando API Gateway en puerto 8080..." -ForegroundColor Green
Write-Host "📡 Service Discovery habilitado" -ForegroundColor Cyan
Write-Host "🌡️ Módulo de clima disponible en: http://localhost:8080/clima/*" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints disponibles:" -ForegroundColor White
Write-Host "  - Health Check: http://localhost:8080/api-gateway/health" -ForegroundColor Gray
Write-Host "  - Service Info: http://localhost:8080/api-gateway/info" -ForegroundColor Gray
Write-Host "  - Service Discovery: http://localhost:8080/api-gateway/services" -ForegroundColor Gray
Write-Host "  - Clima Auth: http://localhost:8080/clima/api/auth/login" -ForegroundColor Gray
Write-Host "  - Clima Docs: http://localhost:8080/clima/api-docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Para probar la integración:" -ForegroundColor Yellow
Write-Host "1. Asegúrate de que el módulo de clima esté corriendo en puerto 3000" -ForegroundColor Gray
Write-Host "2. Visita http://localhost:8080/api-gateway/health para verificar el estado" -ForegroundColor Gray
Write-Host ""

npm start
