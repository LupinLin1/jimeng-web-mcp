import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

interface ServerInstance {
    server: McpServer;
    transport: StdioServerTransport;
}
declare const createServer: () => McpServer;
declare const startServer: () => Promise<ServerInstance>;

export { type ServerInstance, createServer, startServer };
