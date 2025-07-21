# Script de prueba para verificar la integración del API Gateway con el módulo de clima

Write-Host "🧪 Script de prueba - API Gateway + Módulo de Clima" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# URLs base
$API_GATEWAY_URL = "http://localhost:8080"
$CLIMA_MODULE_URL = "http://localhost:3000"

# Función para hacer peticiones HTTP
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "🔍 Probando: $Description" -ForegroundColor Yellow
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $response = $null
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" -ErrorAction Stop
        }
        
        Write-Host "   ✅ Respuesta exitosa" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "1️⃣ Verificando que el módulo de clima esté corriendo..." -ForegroundColor Cyan
$climaRunning = Test-Endpoint -Url "$CLIMA_MODULE_URL/api-docs" -Description "Módulo de clima directo"

if (-not $climaRunning) {
    Write-Host ""
    Write-Host "⚠️  El módulo de clima no está corriendo en puerto 3000" -ForegroundColor Yellow
    Write-Host "   Por favor ejecuta: npm run dev en la carpeta del módulo de clima" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "2️⃣ Verificando que el API Gateway esté corriendo..." -ForegroundColor Cyan
$gatewayRunning = Test-Endpoint -Url "$API_GATEWAY_URL/api-gateway/health" -Description "API Gateway health check"

if (-not $gatewayRunning) {
    Write-Host ""
    Write-Host "⚠️  El API Gateway no está corriendo en puerto 8080" -ForegroundColor Yellow
    Write-Host "   Por favor ejecuta: npm run serve en la carpeta del API Gateway" -ForegroundColor Gray
    Write-Host ""
}

if ($climaRunning -and $gatewayRunning) {
    Write-Host ""
    Write-Host "3️⃣ Probando la integración a través del API Gateway..." -ForegroundColor Cyan
    
    # Probar endpoints del clima a través del API Gateway
    $tests = @(
        @{
            Url = "$API_GATEWAY_URL/clima/api-docs"
            Description = "Documentación Swagger del clima via Gateway"
        },
        @{
            Url = "$API_GATEWAY_URL/api-gateway/services"
            Description = "Estado del service discovery"
        },
        @{
            Url = "$API_GATEWAY_URL/api-gateway/info"
            Description = "Información del API Gateway"
        }
    )
    
    $successCount = 0
    foreach ($test in $tests) {
        if (Test-Endpoint -Url $test.Url -Description $test.Description) {
            $successCount++
        }
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host ""
    Write-Host "📊 Resultados:" -ForegroundColor White
    Write-Host "   Pruebas exitosas: $successCount de $($tests.Count)" -ForegroundColor $(if ($successCount -eq $tests.Count) { "Green" } else { "Yellow" })
    
    if ($successCount -eq $tests.Count) {
        Write-Host ""
        Write-Host "🎉 ¡Integración exitosa!" -ForegroundColor Green
        Write-Host "   El API Gateway está correctamente conectado al módulo de clima" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔗 URLs útiles:" -ForegroundColor Cyan
        Write-Host "   - API Gateway Health: $API_GATEWAY_URL/api-gateway/health" -ForegroundColor Gray
        Write-Host "   - Clima Docs: $API_GATEWAY_URL/clima/api-docs" -ForegroundColor Gray
        Write-Host "   - Service Discovery: $API_GATEWAY_URL/api-gateway/services" -ForegroundColor Gray
        Write-Host ""
        Write-Host "📝 Para probar endpoints con autenticación:" -ForegroundColor Yellow
        Write-Host "   1. Haz login: POST $API_GATEWAY_URL/clima/api/auth/login" -ForegroundColor Gray
        Write-Host "   2. Usa el JWT token en el header Authorization" -ForegroundColor Gray
        Write-Host "   3. Accede a: GET $API_GATEWAY_URL/clima/api/consulta-clima?ciudad=Medellín" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "⚠️  Algunas pruebas fallaron. Verifica los logs para más detalles." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ No se pueden ejecutar las pruebas de integración" -ForegroundColor Red
    Write-Host "   Asegúrate de que tanto el módulo de clima como el API Gateway estén corriendo" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "🏁 Pruebas completadas" -ForegroundColor Green
