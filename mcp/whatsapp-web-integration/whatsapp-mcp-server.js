/**
 * WhatsApp Web MCP Server for LiveKit Voice Agent
 * Uses whatsapp-web.js to provide WhatsApp capabilities via Model Context Protocol
 */

// Since we can't use the full MCP SDK, we'll implement a basic MCP-compatible server
// that communicates via standard input/output

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

class WhatsAppMCPServer {
    constructor() {
        this.client = null;
        this.connected = false;
        this.qrReceived = false;
        this.sessionId = null;
        
        // Initialize WhatsApp client with local authentication
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            }
        });

        // Event handlers for WhatsApp client
        this.client.on('qr', (qr) => {
            console.error('QR Code received for WhatsApp authentication:');
            // Generate QR code but output to stderr only
            // We need to capture stdout and redirect to stderr
            const originalWrite = process.stdout.write.bind(process.stdout);
            process.stdout.write = (chunk, encoding, callback) => {
                process.stderr.write(chunk, encoding, callback);
                return true;
            };
            
            qrcode.generate(qr, { small: true });
            
            // Restore stdout
            process.stdout.write = originalWrite;
            
            this.qrReceived = true;
        });

        this.client.on('ready', () => {
            console.error('WhatsApp Client is ready!');
            this.connected = true;
        });

        this.client.on('authenticated', () => {
            console.error('WhatsApp Client is authenticated!');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('Authentication failure:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.error('Client was logged out', reason);
            this.connected = false;
        });
    }

    async initialize() {
        console.error('Initializing WhatsApp MCP Server...');
        await this.client.initialize();
        
        // Wait for client to be ready
        await new Promise((resolve) => {
            const checkReady = () => {
                if (this.connected || this.qrReceived) {
                    resolve();
                } else {
                    setTimeout(checkReady, 500);
                }
            };
            checkReady();
        });
    }

    async sendMessage(to, message) {
        try {
            const result = await this.client.sendMessage(to, message);
            return {
                success: true,
                messageId: result.id._serialized,
                timestamp: result.timestamp,
                message: 'Message sent successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getChatHistory(contactId, limit = 10) {
        try {
            const chat = await this.client.getChatById(contactId);
            const messages = await chat.fetchMessages({limit: limit});
            return messages.map(msg => ({
                id: msg.id._serialized,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                timestamp: msg.timestamp,
                type: msg.type
            }));
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getContacts() {
        try {
            const contacts = await this.client.getContacts();
            return contacts.map(contact => ({
                id: contact.id._serialized,
                name: contact.name || contact.pushname || contact.number,
                number: contact.number,
                isBusiness: contact.isBusiness
            }));
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // MCP protocol handler - reads from stdin and responds via stdout
    async startMCPProtocol() {
        console.error('WhatsApp MCP Server initialized. Waiting for MCP requests...');

        // Set up stdin to listen for MCP requests
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', async (data) => {
            const lines = data.split('\n').map(line => line.trim()).filter(Boolean);
            for (const line of lines) {
                let request = null;
                let requestId = null;
                
                try {
                    // Parse the incoming MCP request
                    request = JSON.parse(line);
                    requestId = request.id;
                
                    // Extract the method and parameters
                    const { method, params } = request;
                    
                    let result;
                    
                    switch (method) {
                        case 'initialize':
                            await this.initialize();
                            result = {
                                protocolVersion: '2024-11-05',
                                capabilities: {
                                    tools: {}
                                },
                                serverInfo: {
                                    name: 'WhatsApp Web MCP Server',
                                    version: '1.0.0'
                                }
                            };
                            break;
                        
                        case 'notifications/initialized':
                            // Just acknowledge this notification, don't send a response
                            continue;
                        
                        case 'tools/list':
                            result = {
                                tools: [
                                    {
                                        name: 'whatsapp_send_message',
                                        description: 'Send a WhatsApp message to a contact or phone number.',
                                        inputSchema: {
                                            type: 'object',
                                            properties: {
                                                to: { type: 'string', description: 'WhatsApp ID or phone number' },
                                                message: { type: 'string', description: 'Message text to send' }
                                            },
                                            required: ['to', 'message'],
                                            additionalProperties: false
                                        }
                                    },
                                    {
                                        name: 'whatsapp_get_chat_history',
                                        description: 'Fetch recent messages from a WhatsApp chat.',
                                        inputSchema: {
                                            type: 'object',
                                            properties: {
                                                contactId: { type: 'string', description: 'WhatsApp chat/contact ID' },
                                                limit: { type: 'integer', description: 'Max number of messages', default: 10 }
                                            },
                                            required: ['contactId'],
                                            additionalProperties: false
                                        }
                                    },
                                    {
                                        name: 'whatsapp_get_contacts',
                                        description: 'List WhatsApp contacts for the authenticated account.',
                                        inputSchema: {
                                            type: 'object',
                                            properties: {},
                                            additionalProperties: false
                                        }
                                    }
                                ]
                            };
                            break;
                            
                        case 'tools/call':
                        case 'call_tool':
                            const { name: toolName, arguments: args } = params;
                            
                            if (!this.connected && !this.qrReceived) {
                                throw new Error("WhatsApp client not connected. Scan QR code to authenticate.");
                            }
                            
                            switch (toolName) {
                                case 'whatsapp_send_message':
                                    result = await this.sendMessage(args.to, args.message);
                                    break;
                                    
                                case 'whatsapp_get_chat_history':
                                    result = await this.getChatHistory(args.contactId, args.limit || 10);
                                    break;
                                    
                                case 'whatsapp_get_contacts':
                                    result = await this.getContacts();
                                    break;
                                    
                                default:
                                    throw new Error(`Unknown tool: ${toolName}`);
                            }
                            break;
                            
                        default:
                            throw new Error(`Unknown method: ${method}`);
                    }
                    
                    // Send response back via stdout
                    const response = {
                        jsonrpc: '2.0',
                        id: requestId,
                        result: result
                    };
                    
                    process.stdout.write(JSON.stringify(response) + '\n');
                    
                } catch (error) {
                    // Log errors to stderr for debugging
                    console.error('Error processing request:', error.message);
                    
                    // Send error response only if we have a request ID
                    if (requestId !== null && requestId !== undefined) {
                        const response = {
                            jsonrpc: '2.0',
                            id: requestId,
                            error: {
                                code: -32603,
                                message: error.message
                            }
                        };
                        
                        process.stdout.write(JSON.stringify(response) + '\n');
                    }
                }
            }
        });
        
        // Handle errors on stdin
        process.stdin.on('error', (err) => {
            console.error('Error reading from stdin:', err);
        });
    }
}

// Create and start the server
const server = new WhatsAppMCPServer();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.error('\nShutting down WhatsApp MCP Server...');
    if (server.client) {
        await server.client.destroy();
    }
    process.exit(0);
});

// Start the MCP protocol
server.startMCPProtocol().catch(error => {
    console.error('Error starting WhatsApp MCP Server:', error);
    process.exit(1);
});
