#!/bin/bash

# Script para iniciar el API Gateway con el módulo de clima
echo "🚀 Iniciando API Gateway con integración del módulo de clima..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

# Verificar si npm está disponible
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está disponible. Por favor instala npm primero."
    exit 1
fi

echo "📦 Instalando dependencias del API Gateway..."
cd "c:\Users\micha\Desktop\Aws\Api_Gateway"
npm install

echo "🔧 Compilando TypeScript..."
npm run build

echo "✅ Iniciando API Gateway en puerto 8080..."
echo "📡 Service Discovery habilitado"
echo "🌡️ Módulo de clima disponible en: http://localhost:8080/clima/*"
echo ""
echo "Endpoints disponibles:"
echo "  - Health Check: http://localhost:8080/api-gateway/health"
echo "  - Service Info: http://localhost:8080/api-gateway/info"
echo "  - Clima Auth: http://localhost:8080/clima/api/auth/login"
echo "  - Clima Docs: http://localhost:8080/clima/api-docs"
echo ""

npm start
