#!/bin/bash
pkill -9 -f "retriva.ingestion_api"
pkill -9 -f "retriva_gateway.main"
sleep 2

CORE_VENV="/home/llandre/devel/ai/retriva/implementation/retriva/.venv"

# Core Ingestion API
cd /home/llandre/devel/ai/retriva/implementation/retriva
mkdir -p logs
export PYTHONPATH=src
nohup $CORE_VENV/bin/python3 -m retriva.ingestion_api > logs/ingestion_api_new.log 2>&1 &
echo "Started Ingestion API"

# Gateway
cd /home/llandre/devel/ai/retriva/implementation/retriva-gateway
mkdir -p logs
export PYTHONPATH=src
nohup $CORE_VENV/bin/python3 -m retriva_gateway.main > logs/gateway_new.log 2>&1 &
echo "Started Gateway"

sleep 5
ps aux | grep -E "ingestion_api|gateway"
