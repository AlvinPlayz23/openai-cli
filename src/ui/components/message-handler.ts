import chalk from 'chalk';
import boxen from 'boxen';
import { highlight } from 'cli-highlight';
import { createPatch } from 'diff';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TodosService } from '../../mcp/services';
import { CheckpointService, languageService } from '../../services';
import { ChatMessage, openAIService } from '../../services/openai';
import { StorageService } from '../../services/storage';
import { SystemDetector } from '../../services/system-detector';
import { Messages } from '../../types/language';
import { AnimationUtils, LoadingController } from '../../utils';
import type { Message } from '../../utils/token-calculator';
import { TokenCalculator } from '../../utils/token-calculator';
import { StreamRenderer } from './stream-renderer';
import { HistoryEditor } from './history-editor';
// Unified border colors for chat boxes
const BORDER_COLORS = {
    user: 'blue',
    ai: 'green',
    tool: 'yellow'
} as const;
// Tool output visibility toggle
let TOOL_OUTPUT_VISIBLE = false; // global within module
// Reasoning visibility toggle
var REASONING_VISIBLE = false;

function formatToolSummary(functionName: string, parameters: any, result: any): { title: string; lines?: number; display: string; target: string; targetShort: string } {
    const mapName = (fn: string): string => {
        if (fn.includes('read_file')) return 'Read';
        if (fn.includes('list_directory')) return 'List';
        if (fn.includes('search_files')) return 'Search Files';
        if (fn.includes('search_file_content')) return 'Search Content';
        if (fn.includes('code_reference_search')) return 'Code Ref';
        if (fn.includes('execute_command')) return 'Run';
        if (fn.includes('todos')) return 'Todos';
        if (fn.includes('file-system')) return 'FS';
        return fn;
    };
    const display = mapName(functionName);
    const target = parameters?.path || parameters?.keyword || parameters?.query || parameters?.command || parameters?.processId || '';

    // format target
    let targetStr = String(target);
    try {
        if (targetStr) {
            const cwd = process.cwd();
            if (path.isAbsolute(targetStr)) {
                targetStr = path.relative(cwd, targetStr) || targetStr;
            }
            // normalize separators for display only
            targetStr = targetStr.replace(/\\/g, '/');
        }
    } catch {}
    const targetShort = targetStr ? path.basename(targetStr) : '';

    const title = display + (targetShort ? `(${targetShort})` : '');

    // Determine line count
    let lines: number | undefined;
    if (typeof result === 'string') {
        lines = result.split('\n').length;
    } else if (result?.content && typeof result.content === 'string') {
        lines = result.content.split('\n').length;
    } else if (typeof result?.totalLines === 'number') {
        lines = result.totalLines;
    }
    return { title, lines, display, target: String(target), targetShort };
}


// Lightweight language detection adapted from cn-cli-components
function detectLanguage(code: string): string {
    const patterns = [
        { regex: /^\s*import\s+.*from\s+['"]/m, language: 'javascript' },
        { regex: /^\s*const\s+\w+\s*=\s*require\s*\(/m, language: 'javascript' },
        { regex: /^\s*function\s+\w+\s*\(/m, language: 'javascript' },
        { regex: /^\s*interface\s+\w+/m, language: 'typescript' },
        { regex: /^\s*type\s+\w+\s*=/m, language: 'typescript' },
        { regex: /^\s*def\s+\w+.*:/m, language: 'python' },
        { regex: /^\s*class\s+\w+.*:/m, language: 'python' },
        { regex: /^\s*public\s+class\s+\w+/m, language: 'java' },

        { regex: /^\s*#include\s*</m, language: 'c' },
        { regex: /^\s*using\s+namespace\s+/m, language: 'cpp' },
        { regex: /^\s*using\s+System\s*;/m, language: 'csharp' },
        { regex: /^\s*package\s+main/m, language: 'go' },
        { regex: /^\s*fn\s+\w+\s*\(/m, language: 'rust' },
        { regex: /^\s*<\?php/m, language: 'php' },
        { regex: /^\s*SELECT\s+.*FROM\s+/im, language: 'sql' },
        { regex: /^\s*\{\s*$/m, language: 'json' },
        { regex: /^\s*---\s*$/m, language: 'yaml' },
        { regex: /^\s*#!/m, language: 'bash' },
        { regex: /^\s*<(!DOCTYPE html|html)/im, language: 'html' },
        { regex: /^\s*@media\s+/m, language: 'css' },
        { regex: /^\s*#\s+/m, language: 'markdown' },
    ];
    for (const pattern of patterns) {
        if (pattern.regex.test(code)) return pattern.language;
    }
    return 'javascript';
}

// Render markdown-like content to a chalk-formatted string
function renderMarkdown(content: string): string {
    if (!content) return '';

    // Replace <think> blocks first
    content = content.replace(/<think>([\s\S]*?)<\/think>/g, (_m, p1) => chalk.dim(p1.trim()));

    // Handle fenced code blocks
    content = content.replace(/```(?:(\w+)\n)?([\s\S]*?)```/g, (_m, lang, code) => {
        const language = (lang && String(lang).trim()) || detectLanguage(code);
        const highlighted = highlight(code.trim(), { language: language as any });
        return highlighted;
    });

    // Headings
    content = content.replace(/^#{1}\s+(.+)$/gm, (_m, p1) => chalk.bold.cyan(p1));
    content = content.replace(/^#{2}\s+(.+)$/gm, (_m, p1) => chalk.bold.blue(p1));
    content = content.replace(/^#{3}\s+(.+)$/gm, (_m, p1) => chalk.bold.magenta(p1));
    content = content.replace(/^#{4}\s+(.+)$/gm, (_m, p1) => chalk.bold.yellow(p1));

    // Bold, italic, strike, inline code
    content = content.replace(/\*\*(.+?)\*\*/g, (_m, p1) => chalk.bold(p1));
    content = content.replace(/_(.+?)_/g, (_m, p1) => chalk.italic(p1));
    content = content.replace(/\*((?:[^\s*][^*]*[^\s*])|[^\s*])\*/g, (_m, p1) => chalk.italic(p1));
    content = content.replace(/~~([^~]+)~~/g, (_m, p1) => chalk.strikethrough(p1));
    content = content.replace(/`([^`\n]+)`/g, (_m, p1) => chalk.magentaBright(p1));



    // Links [text](url)
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => chalk.blue.underline(text) + chalk.dim(` (${url})`));

    return content;
}


export interface ChatState {
    canSendMessage: boolean;
    isProcessing: boolean;
}

export interface MessageHandlerCallbacks {
    onStateChange: (state: Partial<ChatState>) => void;
    onLoadingStart: (controller: LoadingController) => void;
    onLoadingStop: () => void;
    getSelectedImageFiles: () => string[];
    getSelectedTextFiles: () => string[];
    addMessage: (message: Message) => void;
    getRecentMessages: (count?: number) => Message[];
    getSystemDetector: () => SystemDetector;
}

export class MessageHandler {
    private currentMessages: Messages;
    private callbacks: MessageHandlerCallbacks;
    private streamRenderer: StreamRenderer;
    private reasoningStreamRenderer: StreamRenderer;

    constructor(messages: Messages, callbacks: MessageHandlerCallbacks) {
        this.currentMessages = messages;
        this.callbacks = callbacks;
        this.streamRenderer = new StreamRenderer();
        this.reasoningStreamRenderer = new StreamRenderer();

        // 监听语言变更事件
        languageService.onLanguageChange((language) => {
            this.currentMessages = languageService.getMessages();
        });
        this.bindToolOutputToggle();
    }
    
    private bindToolOutputToggle(): void {
        try {
            const stdin = process.stdin;
            if (!stdin.isTTY) return;
            
            // Store the original mode
            const originalMode = stdin.isRaw;
            
            stdin.setEncoding('utf8');
            
            // Create a listener for key events
            const keyListener = (key: string) => {
                // Ctrl+O (ASCII 15)
                if (key === '\u000f') {
                    TOOL_OUTPUT_VISIBLE = !TOOL_OUTPUT_VISIBLE;
                    const status = TOOL_OUTPUT_VISIBLE ? 'ON' : 'OFF';
                    process.stdout.write(`\n${chalk.cyan('Tool output visibility:')} ${chalk.bold(status)}\n\n`);
                }
                // Ctrl+R (ASCII 18)
                else if (key === '\u0012') {
                    REASONING_VISIBLE = !REASONING_VISIBLE;
                    const status = REASONING_VISIBLE ? 'ON' : 'OFF';
                    process.stdout.write(`\n${chalk.cyan('Reasoning visibility:')} ${chalk.bold(status)}\n\n`);
                }
            };
            
            // Remove any existing listeners to avoid duplicates
            stdin.removeAllListeners('data');
            stdin.on('data', keyListener);
        } catch (error) {
            console.debug('Failed to bind tool output toggle:', error);
        }
    }


    updateLanguage(messages: Messages): void {
        this.currentMessages = messages;
    }
    
    /**
     * Display keyboard shortcuts help at the bottom
     */
    displayKeyboardShortcuts(): void {
        const shortcuts = [
            { key: 'Ctrl+O', desc: 'Toggle tool output' },
            { key: 'Ctrl+R', desc: 'Toggle reasoning' },
        ];
        
        const shortcutText = shortcuts
            .map(s => `${chalk.cyan(s.key)}: ${chalk.dim(s.desc)}`)
            .join(chalk.dim(' • '));
        
        console.log();
        console.log(chalk.dim('  Keyboard Shortcuts: ') + shortcutText);
        console.log();
    }

    /**
     * 添加用户消息并显示
     */
    addUserMessage(content: string): void {
        const userMessage: Message = {
            type: 'user',
            content,
            displayContent: content,
            timestamp: new Date()
        };

        this.callbacks.addMessage(userMessage);
        this.displayMessage(userMessage);
    }

    /**
     * 显示消息
     */
    displayMessage(message: Message): void {
        const messages = languageService.getMessages();

        if (message.type === 'user') {
            const label = messages.main.messages.userLabel;
            process.stdout.write('\n' + chalk.blue(label));
            process.stdout.write('\n' + chalk.white(message.displayContent || message.content) + '\n');
        } else if (message.type === 'ai' || message.type === 'tool') {
            const isTool = message.type === 'tool';
            const label = isTool ? messages.main.messages.toolLabel : messages.main.messages.aiLabel;
            const color = isTool ? chalk.yellow : chalk.green;

            const contentToRender = message.displayContent || message.content || '';
            const rendered = renderMarkdown(typeof contentToRender === 'string' ? contentToRender : JSON.stringify(contentToRender));

            process.stdout.write('\n' + color(label));
            process.stdout.write('\n' + rendered + '\n');
        }
    }

    /**
     * 显示 AI 回复，使用美观的流式渲染
     */
    displayAIResponse(content: string): void {
        const messages = languageService.getMessages();

        const rendered = renderMarkdown(content);
        process.stdout.write('\n' + chalk.green(messages.main.messages.aiLabel));
        process.stdout.write('\n' + rendered + '\n');
    }

    /**
     * 注入AI回复（用于外部调用）
     */
    injectAIReply(content: string): void {
        const aiMessage: Message = {
            type: 'ai',
            content,
            displayContent: content,
            timestamp: new Date()
        };

        this.callbacks.addMessage(aiMessage);
        this.displayAIResponse(content);
    }

    /**
     * 构建系统消息
     */
    private buildSystemMessage(langMessages: Messages, selectedTextFiles: string[], allMessages: Message[]): string {
        const apiConfig = StorageService.getApiConfig();

        // 构建系统消息
        const cwd = process.cwd();
        const currentTime = new Date().toLocaleTimeString(langMessages.main.messages.format.timeLocale, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });

        const promptParts = [
            langMessages.main.messages.system.basePrompt
                .replace('{role}', apiConfig.role || '')
                .replace('{cwd}', cwd)
                .replace('{time}', currentTime)
        ];

        if (apiConfig.role) {
            promptParts.push(apiConfig.role);
        }

        // The logic for adding todos has been moved to buildTodoPromptPart.
        // This function now only builds the static part of the prompt.

        // Add a general rule for tool verification
        const toolVerificationPrompt = `**General Tool Interaction Rule:**
Some tools, especially for file editing, will return a "CRITICAL ACTION" or "ACTION REQUIRED" message asking you to verify the result.
When you see such a message, you MUST:
1.  Pause your current task plan (including any todos).
2.  Carefully review the output provided by the tool.
3.  Respond with "√checked" if the action was successful and correct.
4.  If it's incorrect, call the tool again with the necessary corrections.
**Verification is your highest priority.** Do not proceed until you have confirmed the tool's action.`;
        promptParts.push(toolVerificationPrompt);

        // Add Context7 documentation tool usage instruction
        const context7Prompt = `**Context7 Documentation Tool:**
You have access to the Context7 documentation tools that provide up-to-date, version-specific documentation for any library or framework.

**CRITICAL: You MUST use Context7 tools whenever:**
1. The user asks about implementing features with any library/framework (e.g., "create auth with Supabase")
2. You need to generate code that uses external libraries
3. You're unsure about current API usage, methods, or best practices
4. The user mentions a specific package or technology

**How to use Context7:**
1. First, call 'resolve_library_id' with the library name (e.g., "supabase", "next.js", "react")
2. Review the search results and select the most relevant library ID
3. Then call 'get_library_docs' with the exact library ID (format: '/org/project' or '/org/project/version')
4. Use the retrieved documentation to write accurate, up-to-date code

**Example workflow:**
- User: "Create a Next.js API route with rate limiting"
- You: Call resolve_library_id({ libraryName: "next.js" })
- You: Call get_library_docs({ context7CompatibleLibraryID: "/vercel/next.js", topic: "api routes" })
- You: Generate code using the fresh documentation

**Do NOT:**
- Generate code based on outdated knowledge when current docs are available
- Skip Context7 lookup for any library-specific implementations
- Assume API methods exist without verification

**Always prioritize fresh documentation over training data for library-specific code.**`;
        promptParts.push(context7Prompt);

        if (selectedTextFiles.length > 0) {
            const fileList = selectedTextFiles.map(file => `- ${file}`).join('\n');
            promptParts.push(
                langMessages.main.messages.system.fileReferencePrompt
                    .replace('{fileList}', fileList)
            );
        }
        return promptParts.join('\n\n');
    }

    /**
     * 构建系统消息中与TODO相关的部分
     */
    private buildTodoPromptPart(allMessages: Message[]): string {
        const todos = TodosService.getTodos();
        const pendingTodos = todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

        if (pendingTodos.length > 0) {
            const todoListString = pendingTodos.map(t => {
                const statusIcon = t.status === 'in_progress' ? '▶️' : '⚪️';
                return `${statusIcon} ${t.content} (id: ${t.id})`;
            }).join('\n');

            const lastUserMessage = allMessages.filter(m => m.type === 'user').pop();
            const userTask = lastUserMessage ? this.cleanFileReferencesInMessage(lastUserMessage.content as string) : "the user's request";

            return `**CRITICAL: Your primary objective is to complete the user's request: "${userTask}"**

You have a plan to achieve this. You MUST follow the steps below.
1.  Identify the next 'pending' task.
2.  Execute it using the necessary tool(s).
3.  IMMEDIATELY after successful execution, use the 'update_todos' tool to mark the task 'completed'.
This sequence is a single, atomic operation. Proceed without asking for confirmation.

Current Plan *Todo must be completed. Remember to call the tool 'update_todos' after completion.*:
${todoListString}

If it has been completed, remember to call the 'update_todos' tool to update the completed item.`;
        } else {
            return `**important : If the user's request involves a programming task, you MUST first use the 'create_todos' tool to generate a comprehensive, step-by-step plan.**`;
        }
    }

    /**
     * 处理AI请求的主要逻辑
     */
    async processAIRequest(isContinuation: boolean = false): Promise<void> {
        // A new user-initiated task is identified if the most recent message is from the user.
        // This is a more reliable way to determine when to clear the TODO list for a new task.
        const allCurrentMessages = this.callbacks.getRecentMessages();
        const lastMessage = allCurrentMessages.length > 0 ? allCurrentMessages[allCurrentMessages.length - 1] : null;
        if (lastMessage && lastMessage.type === 'user' && !isContinuation) {
            TodosService.clearTodos();

            // 为这项新任务设置一个检查点任务
            const taskId = uuidv4();
            const taskDescription = typeof lastMessage.content === 'string'
                ? (lastMessage.content as string).substring(0, 100)
                : 'Task from non-string message';
            CheckpointService.getInstance().setCurrentTask(taskId, taskDescription);
        }

        const messages = languageService.getMessages();

        // 检查API配置
        const validation = StorageService.validateApiConfig();
        if (!validation.isValid) {
            const errorMsg = messages.main.status.configMissing;
            process.stdout.write(chalk.red(errorMsg) + '\n');
            process.stdout.write(chalk.yellow(messages.main.init.missingItems + ': ' + validation.missing.join(', ')) + '\n');
            process.stdout.write(chalk.cyan(messages.main.init.useConfig + '\n\n'));
            return;
        }

        // 设置处理状态
        this.callbacks.onStateChange({ isProcessing: true, canSendMessage: false });

        let isLoading = false;

        const stopLoading = () => {
            if (isLoading) {
                this.callbacks.onLoadingStop();
                isLoading = false;
            }
        };

        const startLoading = () => {
            if (!isLoading) {
                const loadingController = AnimationUtils.showLoadingAnimation({
                    text: '' // messages.main.status.thinking
                });
                this.callbacks.onLoadingStart(loadingController);
                isLoading = true;
            }
        };

        try {
            const tools = await this.getMcpTools();
            let continueConversation = true;

            while (continueConversation) {
                const chatMessages = await this.buildChatMessages();

                let isFirstChunk = true;
                let isFirstReasoningChunk = true;
                const resetForNewResponse = () => {
                    isFirstChunk = true;
                    isFirstReasoningChunk = true;
                    this.streamRenderer.reset();
                    this.reasoningStreamRenderer.reset();
                };

                resetForNewResponse();
                startLoading();

                let aiResponseContent = '';

                const result = await openAIService.streamChat({
                    messages: chatMessages,
                    tools: tools.length > 0 ? tools : undefined,
                    onReasoningChunk: (chunk: string) => {
                        stopLoading();
                        if (isFirstReasoningChunk) {
                            const timeStr = new Date().toLocaleTimeString(messages.main.messages.format.timeLocale, {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            // Simple thinking indicator
                            const thinkingPrefix = chalk.bgHex('#6B7280').white.bold(` Thinking `) + 
                                                 chalk.hex('#6B7280')(` ${timeStr} `);
                            process.stdout.write(`\n${thinkingPrefix}\n`);
                            if (REASONING_VISIBLE) {
                                process.stdout.write(chalk.dim('┌─ Reasoning ──────────────────────────────────\n'));
                            }
                            isFirstReasoningChunk = false;
                        }
                        if (REASONING_VISIBLE) {
                            const formattedChunk = this.reasoningStreamRenderer.processChunk(chunk);
                            if (formattedChunk) {
                                process.stdout.write(chalk.dim('│ ') + chalk.gray(formattedChunk));
                            }
                        }
                        startLoading();
                    },
                    onToolChunk: (toolChunk) => { },
                    onAssistantMessage: ({ content, toolCalls }) => {
                        stopLoading();

                        const finalContent = this.streamRenderer.finalize();
                        if (finalContent) {
                            process.stdout.write(finalContent);
                        }
                        const finalReasoningContent = this.reasoningStreamRenderer.finalize();
                        if (finalReasoningContent && REASONING_VISIBLE) {
                            process.stdout.write(chalk.dim('│ ') + chalk.gray(finalReasoningContent));
                            process.stdout.write('\n' + chalk.dim('└──────────────────────────────────────────────\n'));
                        } else if (finalReasoningContent && !REASONING_VISIBLE) {
                            // Show hint that reasoning is available
                            process.stdout.write(chalk.dim('  Reasoning available (Ctrl+R to toggle)\n'));
                        }
                        this.reasoningStreamRenderer.reset();

                        const aiMessage: Message = {
                            type: 'ai',
                            content: content,
                            tool_calls: toolCalls,
                            displayContent: content,
                            timestamp: new Date()
                        };
                        this.callbacks.addMessage(aiMessage);
                    },
                    onChunk: (chunk: string) => {
                        stopLoading();
                        // Buffer streamed chunks and format internally without printing
                        this.streamRenderer.processChunk(chunk);
                        aiResponseContent += chunk;
                        startLoading();
                    },
                    onComplete: (fullResponse: string) => {
                        stopLoading();

                        const finalContent = this.streamRenderer.finalize();
                        const finalReasoningContent = this.reasoningStreamRenderer.finalize();
                        
                        // Close reasoning box if visible
                        if (finalReasoningContent && REASONING_VISIBLE) {
                            process.stdout.write('\n' + chalk.dim('└──────────────────────────────────────────────\n\n'));
                        }
                        this.reasoningStreamRenderer.reset();

                        const combined = (finalContent || '') || aiResponseContent || fullResponse || '';
                        const rendered = renderMarkdown(combined);
                        
                        process.stdout.write('\n' + chalk.green(messages.main.messages.aiLabel));
                        process.stdout.write('\n' + rendered + '\n');

                        if (fullResponse) {
                            const aiMessage: Message = {
                                type: 'ai',
                                content: fullResponse,
                                displayContent: fullResponse,
                                timestamp: new Date()
                            };
                            this.callbacks.addMessage(aiMessage);
                        }
                    },
                    onError: (error: Error) => {
                        stopLoading();
                        const finalReasoningContent = this.reasoningStreamRenderer.finalize();
                        if (finalReasoningContent && REASONING_VISIBLE) {
                            process.stdout.write('\n' + chalk.dim('└──────────────────────────────────────────────\n\n'));
                        }
                        
                        // Simple error display
                        const errorMsg = `${messages.main.status.connectionError}: ${error.message}`;
                        process.stdout.write(chalk.red(errorMsg) + '\n\n');
                        continueConversation = false; // Stop loop on error
                    }
                });

                if (result.status === 'tool_calls') {
                    stopLoading();
                    const toolCalls = result.assistantResponse.tool_calls || [];
                    
                    for (const toolCall of toolCalls) {
                        await this.handleToolCall(toolCall);
                    }
                    
                    // Continue loop to let AI respond to tool results
                } else {
                    continueConversation = false; // 'done' or error
                }
            }
        } catch (error) {
            stopLoading();
            const errorMsg = error instanceof Error ? error.message : messages.main.status.unknownError;
            process.stdout.write(chalk.red(`${messages.main.status.connectionError}: ${errorMsg}`) + '\n\n');
        } finally {
            // 清除当前任务ID，为下一次请求做准备
            CheckpointService.getInstance().clearCurrentTask();
            this.callbacks.onStateChange({ isProcessing: false, canSendMessage: true });
        }
    }

    /**
     * 获取MCP工具定义
     */
    private async getMcpTools(): Promise<any[]> {
        try {
            const systemDetector = this.callbacks.getSystemDetector();
            const tools = await systemDetector.getAllToolDefinitions();
            return tools;
        } catch (error) {
            console.warn('Failed to get MCP tools:', error);
            return [];
        }
    }

    /**
     * 处理工具调用
     */
    private async handleToolCall(toolCall: any): Promise<void> {
        try {
            const messages = languageService.getMessages();
            const functionName = toolCall.function.name;
            const parameters = JSON.parse(toolCall.function.arguments || '{}');

            // Simple tool call indicator
            const summaryIntro = formatToolSummary(functionName, parameters, null);
            const intro = `${chalk.cyan(summaryIntro.display)}${summaryIntro.targetShort ? chalk.gray(` (${summaryIntro.targetShort})`) : ''}`;
            process.stdout.write(`\n${intro}\n`);

            const needsConfirmation = StorageService.isFunctionConfirmationRequired(functionName);

            if (needsConfirmation) {
                let diff: string | undefined;
                if (functionName === 'file-system_create_file') {
                    const targetPath = path.resolve(parameters.path);
                    const newContent = parameters.content || '';
                    diff = createPatch(targetPath, '', newContent, '', '', { context: 3 });
                } else if (functionName === 'file-system_edit_file') {
                    const targetPath = path.resolve(parameters.path);
                    let originalContent = '';
                    if (fs.existsSync(targetPath)) {
                        originalContent = fs.readFileSync(targetPath, 'utf8');
                    }

                    const { startLine, endLine, newContent } = parameters;
                    const originalSlice = originalContent.split('\n').slice(startLine - 1, endLine).join('\n');
                    const partialPatch = createPatch(targetPath, originalSlice, newContent, '', '', { context: 3 });

                    const newContentLineCount = newContent === '' ? 0 : newContent.split('\n').length;
                    const oldContentLineCount = endLine - startLine + 1;
                    const correctHeader = `@@ -${startLine},${oldContentLineCount} +${startLine},${newContentLineCount} @@`;

                    const patchLines = partialPatch.split('\n');
                    const hunkHeaderIndex = patchLines.findIndex(line => line.startsWith('@@'));
                    if (hunkHeaderIndex !== -1) {
                        patchLines[hunkHeaderIndex] = correctHeader;
                        diff = patchLines.join('\n');
                    } else {
                        diff = partialPatch;
                    }
                }

                const shouldExecute = await this.askUserConfirmation(functionName, parameters, diff);

                if (!shouldExecute) {
                    const rejectionMessage = `User rejected the tool call: ${functionName}`;
                    console.log(chalk.yellow(messages.main.messages.toolCall.rejected));

                    const toolResultMessage: Message = {
                        type: 'tool',
                        tool_call_id: toolCall.id,
                        name: functionName,
                        content: { error: rejectionMessage },
                        displayContent: `⚠️ **Tool Result: ${functionName}**\n\n${rejectionMessage}`,
                        timestamp: new Date()
                    };
                    this.callbacks.addMessage(toolResultMessage);
                    return;
                }
                console.log(chalk.green(messages.main.messages.toolCall.approved));
            }

            const systemDetector = this.callbacks.getSystemDetector();
            const result = await systemDetector.executeMcpTool(functionName, parameters);

            let resultContent = '';
            if (result && typeof result === 'object') {
                if (result.diff) {
                    const displayDiff = highlight(result.diff, { language: 'diff' });
                    resultContent = `✅ **Tool Result: ${functionName}**\n\n${result.message || ''}\n\n${displayDiff}`;
                } else if (result.content) {
                    resultContent = `✅ **Tool Result: ${functionName}**\n\n`;
                    if (result.structure) {
                        resultContent += result.structure;
                    } else {
                        resultContent += `**File:** ${parameters.path || 'Unknown'}\n`;
                        if (result.totalLines) {
                            resultContent += `**Lines:** ${result.lineRange?.start || 1}-${result.lineRange?.end || result.totalLines} of ${result.totalLines}\n`;
                        }
                        if (result.tokenCount) {
                            resultContent += `**Tokens:** ${result.tokenCount}\n`;
                        }
                        if (result.isPartial) {
                            resultContent += `**Status:** Partial content (truncated due to token limit)\n`;
                        }
                        if (result.message) {
                            resultContent += `**Message:** ${result.message}\n`;
                        }
                        resultContent += `\n**Content:**\n\`\`\`\n${result.content}\n\`\`\``;
                    }
                } else {
                    resultContent = `✅ **Tool Result: ${functionName}**\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
                }
            } else {
                resultContent = `✅ **Tool Result: ${functionName}**\n\n${String(result)}`;
            }

            // Enhanced tool result summary with better visual hierarchy
            const summary = formatToolSummary(functionName, parameters, result);
            const linesText = typeof summary.lines === 'number' ? chalk.dim(` • ${summary.lines} lines`) : '';
            const successIcon = chalk.green('✓');
            process.stdout.write(chalk.gray(`  ${successIcon} ${summary.display}${linesText}`) + '\n');
            
            if (TOOL_OUTPUT_VISIBLE) {
                const rendered = renderMarkdown(resultContent);
                const boxed = boxen(rendered, { 
                    padding: 1, 
                    borderStyle: 'round', 
                    borderColor: BORDER_COLORS.tool, 
                    title: `${messages.main.messages.toolLabel} Output`,
                    titleAlignment: 'left' 
                });
                process.stdout.write(`\n${boxed}\n`);
            } else {
                // Show hint about Ctrl+O to view output
                process.stdout.write(chalk.dim(`  Press Ctrl+O to toggle tool output visibility\n`));
            }


            const toolResultMessage: Message = {
                type: 'tool',
                tool_call_id: toolCall.id,
                name: functionName,
                content: result ?? 'SUCCESS',
                displayContent: resultContent,
                timestamp: new Date()
            };
            this.callbacks.addMessage(toolResultMessage);
        } catch (error) {
            const messages = languageService.getMessages();
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.log(chalk.red(messages.main.messages.toolCall.failed.replace('{error}', errorMsg)));

            // Simple error indicator
            const title = `Error in ${toolCall.function?.name || 'Unknown'}`;
            process.stdout.write(`\n${chalk.red(title)}\n${chalk.red(errorMsg)}\n`);

            const errorMessage: Message = {
                type: 'tool',
                tool_call_id: toolCall.id,
                name: toolCall.function?.name || 'Unknown',
                content: {
                    error: errorMsg,
                    tool_call_id: toolCall.id,
                },
                displayContent: `Error: ${errorMsg}`,
                timestamp: new Date()
            };
            this.callbacks.addMessage(errorMessage);
        }
    }



    /**
     * 询问用户是否确认执行函数
     */
    private async askUserConfirmation(functionName: string, parameters: any, diff?: string): Promise<boolean> {
        const messages = languageService.getMessages();

        console.log();
        console.log(chalk.yellow(messages.main.messages.toolCall.handle));
        console.log(chalk.white(`Tool: ${chalk.bold(functionName)}`));

        if (diff) {
            console.log(chalk.yellow.bold('--- Proposed Changes ---'));
            console.log(highlight(diff, { language: 'diff' }));
            console.log(chalk.yellow.bold('------------------------'));
        }

        return new Promise((resolve) => {
            console.log(chalk.yellow(messages.main.messages.toolCall.confirm));
            console.log(chalk.gray(messages.main.messages.toolCall.confirmOptions));
            process.stdout.write(chalk.yellow(messages.main.messages.toolCall.pleaseSelect));

            // 确保stdin处于正确状态
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            process.stdin.setEncoding('utf8');

            const cleanup = () => {
                process.stdin.removeListener('data', keyHandler);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                process.stdin.pause();
            };

            const keyHandler = (key: string) => {
                switch (key.toLowerCase()) {
                    case 'y':
                        process.stdout.write(chalk.green('yes\n'));
                        cleanup();
                        resolve(true);
                        break;
                    case 'n':
                        process.stdout.write(chalk.red('no\n'));
                        cleanup();
                        resolve(false);
                        break;
                    case '\r': // 回车
                    case '\n':
                        process.stdout.write(chalk.green('yes\n'));
                        cleanup();
                        resolve(true);
                        break;
                    case '\u0003': // Ctrl+C
                        process.stdout.write(chalk.red('no\n'));
                        cleanup();
                        resolve(false);
                        break;
                    // 忽略其他按键
                }
            };

            process.stdin.on('data', keyHandler);
        });
    }

    private getMimeType(extension: string): string | null {
        const mimeTypes: { [key: string]: string } = {
            '.png': 'image/png',
            '.jpeg': 'image/jpeg',
            '.jpg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
        };
        return mimeTypes[extension.toLowerCase()] || null;
    }

    /**
     * 清理用户消息中的@文件引用，将@文件路径转换为纯文件路径说明
     */
    private cleanFileReferencesInMessage(content: string): string {
        // 移除所有@文件引用
        return content.replace(/@([^\s@]+)(?=\s|$)/g, '').trim();
    }

    /**
     * 构建包含历史记录和文件信息的聊天消息
     */
    private async buildChatMessages(): Promise<ChatMessage[]> {
        const langMessages = languageService.getMessages();
        const selectedTextFiles = this.callbacks.getSelectedTextFiles();

        // 1. Get the complete message history ONCE.
        const allMessages = this.callbacks.getRecentMessages();

        // 2. Build the static part of the system message.
        const baseSystemMessage = this.buildSystemMessage(langMessages, selectedTextFiles, allMessages);

        // 3. Append the dynamic TODO part to the system message
        const todoPromptPart = this.buildTodoPromptPart(allMessages);

        // 4. Use TokenCalculator to intelligently select and compress the history.
        // This is now an async call.
        const tokenResult = await TokenCalculator.selectHistoryMessages(
            allMessages,
            `${baseSystemMessage}\n\n${todoPromptPart}`,
            0.7 // Use 70% of context to leave room for tool calls
        );

        const summaryPromptPart = tokenResult.summary ? `\n\n[Prior conversation summary: ${tokenResult.summary}]` : '';
        const systemMessageContent = `${baseSystemMessage}\n\n${todoPromptPart}${summaryPromptPart}`;


        // `tokenResult.allowedMessages` is now an array that both fits the token limit and is guaranteed to start with a user message.
        const recentMessages = tokenResult.allowedMessages;

        // 5. Build the final chatMessages array.
        const chatMessages: ChatMessage[] = [];
        if (systemMessageContent) {
            chatMessages.push({ role: 'system', content: systemMessageContent });
        }

        // 6. Convert the selected message history for the API, ensuring tool messages are valid.
        let expectedToolMessages = 0;
        for (const msg of (recentMessages as any[])) {
            if (msg.type === 'user') {
                const userMessage: ChatMessage = { role: 'user', content: msg.content };
                chatMessages.push(userMessage);
                expectedToolMessages = 0;
            } else if (msg.type === 'ai') {
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: msg.content || null,
                    tool_calls: msg.tool_calls,
                };
                chatMessages.push(assistantMessage);
                if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                    expectedToolMessages = assistantMessage.tool_calls.length;
                } else {
                    expectedToolMessages = 0;
                }
            } else if (msg.type === 'tool') {
                if (expectedToolMessages > 0) {
                    const toolMessage: ChatMessage = {
                        role: 'tool',
                        tool_call_id: msg.tool_call_id,
                        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? null),
                    };
                    chatMessages.push(toolMessage);
                    expectedToolMessages--;
                }
            }
        }

        const selectedImageFiles = this.callbacks.getSelectedImageFiles();

        // 处理文件内容
        let fileContents = '';
        if (selectedTextFiles.length > 0) {
            fileContents = selectedTextFiles
                .map((filePath: string) => {
                    try {
                        const absolutePath = path.resolve(process.cwd(), filePath);
                        //const content = fs.readFileSync(absolutePath, 'utf-8');
                        return `--- ${filePath} ---`;
                    } catch (error) {
                        this.displayMessage({
                            type: 'system',
                            content: chalk.red(
                                langMessages.main.fileSearch.fileReadError.replace(
                                    '{filePath}',
                                    filePath
                                )
                            ),
                            timestamp: new Date(),
                        });
                        return '';
                    }
                })
                .filter((content: string) => content)
                .join('\n\n');
        }

        // 更新最后一条用户消息
        const lastUserMessage = chatMessages.filter(msg => msg.role === 'user').pop();

        if (lastUserMessage) {
            let userMessageText = '';
            if (typeof lastUserMessage.content === 'string') {
                userMessageText = this.cleanFileReferencesInMessage(lastUserMessage.content);
            }

            if (fileContents) {
                userMessageText = `${fileContents}\n\n${userMessageText}`;
            }

            if (selectedImageFiles.length > 0) {
                const content: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] = [
                    { type: 'text', text: userMessageText }
                ];

                for (const imagePath of selectedImageFiles) {
                    try {
                        const absolutePath = path.resolve(process.cwd(), imagePath);
                        const imageBuffer = fs.readFileSync(absolutePath);
                        const base64Image = imageBuffer.toString('base64');
                        const ext = path.extname(imagePath).toLowerCase();
                        const mimeType = this.getMimeType(ext);

                        if (mimeType) {
                            content.push({
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                },
                            });
                        }
                    } catch (error) {
                        // ... 错误处理
                    }
                }
                lastUserMessage.content = content;
            } else {
                lastUserMessage.content = userMessageText;
            }
        }

        return chatMessages;
    }
}