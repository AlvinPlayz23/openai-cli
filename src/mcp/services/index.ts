// MCP服务导出索引
export { FileSystemService } from './file-system';
export { TerminalService } from './terminal-service';
export { Context7Service } from './context7-service';

// 服务注册表
import { BaseMCPService } from '../base-service';
import { FileSystemService } from './file-system';
import { TodosService } from './todos-service';
import { TerminalService } from './terminal-service';
import { Context7Service } from './context7-service';

export { TodosService };

export const services = [
    new FileSystemService(),
    new TodosService(),
    new TerminalService(),
    new Context7Service(),
];

export function getServices() {
    return services;
}

export function getService(name: string) {
    return services.find(s => s.getServiceInfo().name === name) || null;
}

export async function getAllToolDefinitions() {
    let allTools: any[] = [];
    for (const service of services) {
        const serviceInfo = service.getServiceInfo();
        const tools = serviceInfo.tools.map(tool => {
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                }
            };
        });
        allTools = allTools.concat(tools);
    }
    return allTools;
} 