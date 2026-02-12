#!/bin/bash
# Script para verificar la estructura del proyecto

echo "📁 Verificando estructura del proyecto..."
echo ""

# Verificar que package.json esté en la raíz
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado en la raíz"
else
    echo "❌ ERROR: package.json NO encontrado en la raíz"
    echo "   Ubicación actual: $(pwd)"
    echo "   Archivos en esta carpeta:"
    ls -la
    exit 1
fi

# Verificar estructura de carpetas
echo ""
echo "📂 Estructura de carpetas:"
echo "   - src/ existe: $([ -d "src" ] && echo "✅" || echo "❌")"
echo "   - database/ existe: $([ -d "database" ] && echo "✅" || echo "❌")"
echo "   - tsconfig.json existe: $([ -f "tsconfig.json" ] && echo "✅" || echo "❌")"

echo ""
echo "📄 Contenido de package.json:"
cat package.json | grep -A 2 '"name"'

echo ""
echo "✅ Verificación completada"

