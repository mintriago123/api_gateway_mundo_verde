# Script de prueba para verificar la integracion del API Gateway con el modulo de clima

Write-Host "Script de prueba - API Gateway + Modulo de Clima" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# URLs base
$API_GATEWAY_URL = "http://localhost:8080"
$CLIMA_MODULE_URL = "http://localhost:3000"

# Funcion para hacer peticiones HTTP
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [switch]$AllowDegraded
    )
    
    Write-Host "Probando: $Description" -ForegroundColor Yellow
    Write-Host "   URL: $Url" -ForegroundColor Gray
    
    try {
        $response = $null
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body -ContentType "application/json" -ErrorAction Stop
        }
        
        Write-Host "   [OK] Respuesta exitosa" -ForegroundColor Green
        return $true
    } catch {
        # Para health checks del API Gateway, aceptar 503 como funcionando pero degradado
        if ($AllowDegraded -and $_.Exception.Response.StatusCode -eq 503 -and $Url -like "*api-gateway/health*") {
            Write-Host "   [PARCIAL] API Gateway funcionando pero servicios en estado degradado" -ForegroundColor Yellow
            return $true
        }
        
        Write-Host "   [ERROR] Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "1. Verificando que el modulo de clima este corriendo..." -ForegroundColor Cyan
$climaRunning = Test-Endpoint -Url "$CLIMA_MODULE_URL/health" -Description "Modulo de clima directo"

if (-not $climaRunning) {
    Write-Host ""
    Write-Host "[ADVERTENCIA] El modulo de clima no esta corriendo en puerto 3000" -ForegroundColor Yellow
    Write-Host "   Por favor ejecuta: npm run dev en la carpeta del modulo de clima" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "2. Verificando que el API Gateway este corriendo..." -ForegroundColor Cyan
$gatewayRunning = Test-Endpoint -Url "$API_GATEWAY_URL/api-gateway/health" -Description "API Gateway health check" -AllowDegraded

# Si el health check falla, probar otros endpoints para confirmar si el gateway esta corriendo
if (-not $gatewayRunning) {
    Write-Host "   Probando endpoint alternativo..." -ForegroundColor Gray
    $gatewayRunning = Test-Endpoint -Url "$API_GATEWAY_URL/api-gateway/info" -Description "API Gateway info endpoint"
    
    if (-not $gatewayRunning) {
        $gatewayRunning = Test-Endpoint -Url "$API_GATEWAY_URL/api-gateway/services" -Description "API Gateway services endpoint"
    }
}

if (-not $gatewayRunning) {
    Write-Host ""
    Write-Host "[ADVERTENCIA] El API Gateway no esta corriendo en puerto 8080" -ForegroundColor Yellow
    Write-Host "   Por favor ejecuta: npm run serve en la carpeta del API Gateway" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "   [INFO] API Gateway detectado y funcionando" -ForegroundColor Green
}

if ($climaRunning -and $gatewayRunning) {
    Write-Host ""
    Write-Host "3. Probando la integracion a traves del API Gateway..." -ForegroundColor Cyan
    
    # Probar endpoints del clima a traves del API Gateway
    $tests = @(
        @{
            Url = "$API_GATEWAY_URL/clima/health"
            Description = "Health check del clima via Gateway"
        },
        @{
            Url = "$API_GATEWAY_URL/clima/api-docs/"
            Description = "Documentacion Swagger del clima via Gateway"
        },
        @{
            Url = "$API_GATEWAY_URL/api-gateway/services"
            Description = "Estado del service discovery"
        },
        @{
            Url = "$API_GATEWAY_URL/api-gateway/metrics"
            Description = "Metricas del API Gateway"
        },
        @{
            Url = "$API_GATEWAY_URL/clima/api/consulta-clima?ciudad=Medellin"
            Description = "Consulta de clima funcional (Medellin)"
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
    Write-Host "Resultados:" -ForegroundColor White
    if ($successCount -eq $tests.Count) {
        Write-Host "   Pruebas exitosas: $successCount de $($tests.Count)" -ForegroundColor Green
    } else {
        Write-Host "   Pruebas exitosas: $successCount de $($tests.Count)" -ForegroundColor Yellow
    }
    
    if ($successCount -eq $tests.Count) {
        Write-Host ""
        Write-Host "[EXITO] Integracion exitosa!" -ForegroundColor Green
        Write-Host "   El API Gateway esta correctamente conectado al modulo de clima" -ForegroundColor Green
        Write-Host ""
        Write-Host "URLs utiles:" -ForegroundColor Cyan
        Write-Host "   - API Gateway Health: $API_GATEWAY_URL/api-gateway/health" -ForegroundColor Gray
        Write-Host "   - Clima Health: $API_GATEWAY_URL/clima/health" -ForegroundColor Gray
        Write-Host "   - Clima Docs: $API_GATEWAY_URL/clima/api-docs/" -ForegroundColor Gray
        Write-Host "   - Service Discovery: $API_GATEWAY_URL/api-gateway/services" -ForegroundColor Gray
        Write-Host "   - Metricas: $API_GATEWAY_URL/api-gateway/metrics" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Para probar endpoints con autenticacion:" -ForegroundColor Yellow
        Write-Host "   1. Haz login: POST $API_GATEWAY_URL/clima/api/auth/login" -ForegroundColor Gray
        Write-Host "   2. Usa el JWT token en el header Authorization" -ForegroundColor Gray
        Write-Host "   3. Accede a: GET $API_GATEWAY_URL/clima/api/consulta-clima?ciudad=Medellin" -ForegroundColor Gray
        Write-Host ""
        Write-Host "NOTA IMPORTANTE: Para usar Swagger UI correctamente:" -ForegroundColor Magenta
        Write-Host "   - Accede a: $API_GATEWAY_URL/clima/api-docs/" -ForegroundColor Gray
        Write-Host "   - En Swagger UI, selecciona 'Servidor via API Gateway' en el dropdown" -ForegroundColor Gray
        Write-Host "   - Esto asegura que las pruebas pasen por el API Gateway" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "[ADVERTENCIA] Algunas pruebas fallaron. Verifica los logs para mas detalles." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Diagnostico:" -ForegroundColor Cyan
        Write-Host "   - Verifica que ambos servicios esten corriendo" -ForegroundColor Gray
        Write-Host "   - Revisa los logs del API Gateway para errores de conexion" -ForegroundColor Gray
        Write-Host "   - Confirma que los puertos 3000 y 8080 esten disponibles" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] No se pueden ejecutar las pruebas de integracion" -ForegroundColor Red
    Write-Host "   Asegurate de que tanto el modulo de clima como el API Gateway esten corriendo" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Para iniciar los servicios:" -ForegroundColor Yellow
    Write-Host "   1. Modulo de clima:" -ForegroundColor Gray
    Write-Host "      cd ""c:\Users\micha\Desktop\Aws\MundoVerde\Clima-MundoVerde""" -ForegroundColor Gray
    Write-Host "      npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. API Gateway:" -ForegroundColor Gray
    Write-Host "      cd ""c:\Users\micha\Desktop\Aws\Api_Gateway""" -ForegroundColor Gray
    Write-Host "      npm run serve" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Pruebas completadas" -ForegroundColor Green
