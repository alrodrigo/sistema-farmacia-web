#!/bin/bash

# 🛡️ SCRIPT DE MONITOREO RÁPIDO - FIREBASE
# Ejecuta esto cada semana para revisar el estado del proyecto

echo "======================================"
echo "🔍 MONITOREO SISTEMA FARMACIA"
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Función para abrir URLs
open_url() {
    if command -v xdg-open > /dev/null; then
        xdg-open "$1" &
    elif command -v open > /dev/null; then
        open "$1"
    else
        echo "Abre manualmente: $1"
    fi
}

echo "📊 Abriendo dashboard de Firebase..."
echo ""
open_url "https://console.firebase.google.com/project/sistema-farmacia-web/usage"

sleep 2

echo "✅ CHECKLIST DE VERIFICACIÓN:"
echo ""
echo "[ ] 1. Revisa lecturas de Firestore (debe ser < 40,000/día)"
echo "[ ] 2. Revisa escrituras de Firestore (debe ser < 16,000/día)"
echo "[ ] 3. Revisa ancho de banda de Hosting (debe ser < 8 GB/mes)"
echo "[ ] 4. Verifica que no haya errores críticos"
echo "[ ] 5. Confirma que solo hay usuarios legítimos"
echo ""

echo "⚠️  ALERTAS A REVISAR:"
echo ""
echo "Si ves esto:"
read -p "¿Lecturas > 40,000/día? (s/n): " lecturas
if [ "$lecturas" = "s" ]; then
    echo -e "${RED}⚠️  ALERTA: Uso alto de lecturas. Contacta al cliente.${NC}"
fi

read -p "¿Escrituras > 16,000/día? (s/n): " escrituras
if [ "$escrituras" = "s" ]; then
    echo -e "${RED}⚠️  ALERTA: Uso alto de escrituras. Contacta al cliente.${NC}"
fi

read -p "¿Bandwidth > 8 GB/mes? (s/n): " bandwidth
if [ "$bandwidth" = "s" ]; then
    echo -e "${RED}⚠️  ALERTA: Uso alto de ancho de banda. Revisa logs.${NC}"
fi

read -p "¿Usuarios sospechosos? (s/n): " usuarios
if [ "$usuarios" = "s" ]; then
    echo -e "${RED}⚠️  ALERTA: Revisa Authentication y desactiva usuarios.${NC}"
    open_url "https://console.firebase.google.com/project/sistema-farmacia-web/authentication/users"
fi

echo ""
echo "======================================"
echo "📝 REGISTRO DE REVISIÓN"
echo "======================================"
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Revisado por: Rodrigo"
echo ""

read -p "¿Todo está normal? (s/n): " estado
if [ "$estado" = "s" ]; then
    echo -e "${GREEN}✅ Sistema OK - Sin problemas detectados${NC}"
    echo "✅ Sistema OK - $(date '+%Y-%m-%d %H:%M:%S')" >> ~/sistema_farmacia_web/logs/monitoreo.log
else
    echo -e "${YELLOW}⚠️  Se detectaron alertas - Revisar Firebase Console${NC}"
    echo "⚠️  ALERTA - $(date '+%Y-%m-%d %H:%M:%S')" >> ~/sistema_farmacia_web/logs/monitoreo.log
fi

echo ""
echo "📁 Log guardado en: ~/sistema_farmacia_web/logs/monitoreo.log"
echo ""
echo "Próxima revisión: $(date -d '+7 days' '+%Y-%m-%d')"
echo ""
echo "======================================"
echo "✅ Monitoreo completado"
echo "======================================"
