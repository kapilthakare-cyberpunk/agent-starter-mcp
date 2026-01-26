## MCP WhatsApp Server Issue

### Summary
WhatsApp MCP server fails during MCP initialization with a missing `protocolVersion` field in the server's initialize response. The LiveKit agent starts, loads MCP server definitions, then fails when listing tools from the WhatsApp MCP server.

### Environment
- Project: `/home/kapilt/Projects/agent-starter-python`
- MCP config: `/home/kapilt/Projects/agent-starter-python/mcp/mcp_config.json`
- WhatsApp MCP server: `/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js`
- Python: 3.13.1
- livekit-agents: 1.3.12
- mcp: 1.26.0

### What Worked
- MCP config loads and reports 2 servers (filesystem + whatsapp).
- `mcp-server-filesystem` is on PATH.
- WhatsApp server dependencies installed (including `qrcode-terminal`).

### Failing Symptom
When running:
```
uv run python src/agent.py console
```
the agent loads MCP servers but fails to list tools from the WhatsApp MCP server with:
```
pydantic_core._pydantic_core.ValidationError: 1 validation error for InitializeResult
protocolVersion
  Field required [type=missing, input_value={'capabilities': {'text':...r', 'version': '1.0.0'}}, input_type=dict]
```

This error appears inside:
```
livekit/agents/llm/mcp.py -> mcp/client/session.py -> mcp/shared/session.py
```

### Suspected Cause
The WhatsApp MCP server's `initialize` response is missing the `protocolVersion` field required by the MCP client (pydantic validation). This suggests the server implementation does not match the MCP protocol version expected by `mcp==1.26.0`.

### Next Steps
1. Inspect `/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js` for the `initialize` response payload and add `protocolVersion`.
2. Confirm the expected MCP protocol version with the `mcp` library and align the server response.
3. Re-run `uv run python src/agent.py console` and verify that tools list successfully.

### Progress
- Added `protocolVersion` and implemented `tools/list` + `tools/call` handling in `/home/kapilt/Projects/agent-starter-python/mcp/whatsapp-web-integration/whatsapp-mcp-server.js`.
- WhatsApp server now advertises tool schemas; awaiting re-test.
- Moved all WhatsApp MCP server logs (including QR output) to stderr to avoid corrupting JSON-RPC on stdout.

### Additional Issue
- Filesystem MCP also reported as not working by user; needs separate validation (not yet diagnosed).
