#!/bin/sh
# Levanta el servidor de Manaco Vision en esta Mac y lo publica en internet con ngrok (dominio fijo de la cuenta).
# Uso: sh herramientas/servidor_publico.sh      (Ctrl+C detiene ambos)
cd "$(dirname "$0")/.." || exit 1
CORS_ORIGENES="https://gris999.github.io,http://localhost:8765,http://localhost:8787" node server/servidor.js &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT INT TERM
sleep 1
echo "Servidor local: http://localhost:8787 · Público: https://copartner-compactly-dubbed.ngrok-free.dev"
ngrok http 8787 --url=https://copartner-compactly-dubbed.ngrok-free.dev
