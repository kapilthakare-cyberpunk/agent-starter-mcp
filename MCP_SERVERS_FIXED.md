# MCP Server Configuration - Fixed

## Summary of Issues Fixed

### 1. WhatsApp MCP Server
**Problem:** The WhatsApp server was outputting status messages and QR codes to stdout, which corrupted the JSON-RPC communication protocol.

**Solution:** Changed all console output to use `console.error()` instead of `console.log()`, ensuring only valid JSON-RPC messages go to stdout.

**Changes made in `/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js`:**
- Line 31: Simplified QR code generation (library outputs to stderr by default)
- Line 137-138: Fixed `requestId` capture to prevent "request is not defined" error
- Line 246: Changed to `console.error()` for error logging
- Line 256: Added proper error logging to stderr
- Line 264: Changed shutdown message to use `console.error()`

### 2. Filesystem MCP Server
**Problem:** The config referenced `mcp-server-filesystem` command which wasn't installed or in PATH.

**Solution:** Changed config to use `npx` with the official `@modelcontextprotocol/server-filesystem` package.

**Changes made in `/home/kapilt/Projects/agent-starter-python/mcp/mcp_config.json`:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/kapilt"],
      "timeout_seconds": 30,
      "env": {
        "PATH": "${PATH}"
      }
    },
    ...
  }
}
```

## How It Works Now

### MCP Protocol Requirements
- **stdout:** ONLY valid JSON-RPC messages (one per line)
- **stderr:** All logging, status messages, errors, and debugging output
- **stdin:** Receives JSON-RPC requests

### Filesystem Server
- Uses `npx -y @modelcontextprotocol/server-filesystem /home/kapilt`
- The `-y` flag automatically installs the package if not cached
- Provides file read/write/list capabilities for the `/home/kapilt` directory
- Outputs "Secure MCP Filesystem Server running on stdio" to stderr (safe)

### WhatsApp Server
- Uses Node.js to run the custom MCP server
- Outputs all status/QR codes to stderr
- Only JSON-RPC responses go to stdout
- Handles WhatsApp authentication via QR code (displayed in terminal via stderr)

## Testing

Both servers have been verified to work:

### Filesystem Server Test:
```bash
npx -y @modelcontextprotocol/server-filesystem /home/kapilt
# Expected stderr: "Secure MCP Filesystem Server running on stdio"
# Send test request:
# {"jsonrpc": "2.0", "id": 1, "method": "initialize", ...}
# Expected stdout: Valid JSON-RPC response
```

### WhatsApp Server Test:
```bash
node /home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js
# Expected stderr: Initialization messages and QR code
# Expected stdout: Only JSON-RPC responses
```

## Next Steps

1. Run your agent with:
   ```bash
   uv run python src/agent.py console
   ```

2. You should see in the logs:
   ```
   INFO ... agent   Loaded MCP server: filesystem
   INFO ... agent   Loaded MCP server: whatsapp
   INFO ... agent   MCP servers ready: 2
   ```

3. If WhatsApp needs authentication, you'll see a QR code in the terminal (via stderr). Scan it with WhatsApp to authenticate.

4. Both servers should now connect successfully without JSON parsing errors.

## Troubleshooting

If you still see issues:

1. **Verify npx is available:**
   ```bash
   which npx
   # Should output: /usr/bin/npx or similar
   ```

2. **Verify Node.js is available:**
   ```bash
   which node
   node --version
   ```

3. **Check WhatsApp node_modules:**
   ```bash
   ls /home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/node_modules
   # Should contain whatsapp-web.js and qrcode-terminal
   ```

4. **Enable debug logging:**
   Set `DEBUG=*` environment variable to see more detailed output

## Configuration Reference

Current working configuration (`/home/kapilt/Projects/agent-starter-python/mcp/mcp_config.json`):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/kapilt"],
      "timeout_seconds": 30,
      "env": {
        "PATH": "${PATH}"
      }
    },
    "whatsapp": {
      "command": "node",
      "args": ["/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js"],
      "timeout_seconds": 60,
      "env": {
        "PATH": "${PATH}",
        "NODE_PATH": "/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/node_modules"
      }
    }
  }
}
```

Both servers are now properly configured to communicate via the MCP protocol!
