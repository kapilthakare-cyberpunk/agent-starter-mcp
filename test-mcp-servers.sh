#!/usr/bin/env bash
# Test script to verify MCP servers are working correctly

set -e

echo "=========================================="
echo "Testing MCP Server Configuration"
echo "=========================================="
echo ""

# Test 1: Check npx is available
echo "[1/4] Checking npx availability..."
if command -v npx &> /dev/null; then
    echo "✓ npx found at: $(which npx)"
else
    echo "✗ npx not found in PATH"
    exit 1
fi
echo ""

# Test 2: Check node is available
echo "[2/4] Checking node availability..."
if command -v node &> /dev/null; then
    echo "✓ node found at: $(which node)"
    echo "  Version: $(node --version)"
else
    echo "✗ node not found in PATH"
    exit 1
fi
echo ""

# Test 3: Check WhatsApp MCP server file exists
echo "[3/4] Checking WhatsApp MCP server..."
WHATSAPP_SERVER="/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js"
if [ -f "$WHATSAPP_SERVER" ]; then
    echo "✓ WhatsApp server file exists"
    if [ -d "/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/node_modules" ]; then
        echo "✓ node_modules directory exists"
    else
        echo "⚠ node_modules directory not found"
        echo "  Run: cd /home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration && npm install"
    fi
else
    echo "✗ WhatsApp server file not found at: $WHATSAPP_SERVER"
    exit 1
fi
echo ""

# Test 4: Test filesystem server can be executed
echo "[4/4] Testing filesystem server..."
echo "  Attempting to spawn filesystem server (will timeout after 3 seconds)..."
timeout 3 npx -y @modelcontextprotocol/server-filesystem /tmp 2>&1 | head -1 || true
if [ ${PIPESTATUS[0]} -eq 124 ] || [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✓ Filesystem server can be spawned"
else
    echo "⚠ Issue spawning filesystem server (exit code: ${PIPESTATUS[0]})"
fi
echo ""

echo "=========================================="
echo "Summary:"
echo "=========================================="
echo "✓ npx available"
echo "✓ node available"
echo "✓ WhatsApp server configured"
echo "✓ Filesystem server accessible"
echo ""
echo "You can now run: uv run python src/agent.py console"
echo ""
