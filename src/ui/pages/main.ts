import boxen from 'boxen';
import chalk from 'chalk';
import { languageService } from '../../services/language';
import { StorageService } from '../../services/storage';
import { SystemDetector } from '../../services/system-detector';
import { Messages } from '../../types/language';
import { LoadingController, StringUtils } from '../../utils';
import { ChatState, CommandManager, FileSearchManager, HelpManager, InitHandler, InputHandler, InputState, Message, MessageHandler, MessageHandlerCallbacks, ResponseManager, InterruptHandler, createInterruptHandler, StatusBar } from '../components';
import { ConfigPage } from './config';

export class MainPage {
  private messages: Message[] = [];
  private chatState: ChatState = {
    canSendMessage: true,
    isProcessing: false
  };
  private loadingController: LoadingController | null = null;
  private isDestroyed = false;
  private configChangeListener: ((config: any) => void) | null = null;
  private abortController: AbortController | null = null; // For cancelling AI requests
  private interruptHandler: InterruptHandler | null = null; // For ESC interrupt during streaming

  // Component managers
  private commandManager: CommandManager;
  private helpManager: HelpManager;
  private responseManager: ResponseManager;
  private fileSearchManager: FileSearchManager;
  private inputHandler: InputHandler;
  private initHandler: InitHandler;
  private messageHandler: MessageHandler;
  private currentMessages: Messages;
  private systemDetector: SystemDetector;

  constructor() {
    this.currentMessages = languageService.getMessages();
    this.commandManager = new CommandManager(this.currentMessages);
    this.helpManager = new HelpManager(this.currentMessages);
    this.responseManager = new ResponseManager(this.currentMessages);
    this.fileSearchManager = new FileSearchManager();
    this.inputHandler = new InputHandler(
      this.commandManager,
      this.fileSearchManager,
      this.currentMessages
    );
    this.initHandler = new InitHandler(this.currentMessages);
    this.systemDetector = new SystemDetector();

    // Create MessageHandler callbacks
    const messageHandlerCallbacks: MessageHandlerCallbacks = {
      onStateChange: (state: Partial<ChatState>) => {
        this.setChatState(state);
      },
      onLoadingStart: (controller: LoadingController) => {
        this.loadingController = controller;
      },
      onLoadingStop: () => {
        if (this.loadingController) {
          this.loadingController.stop();
          this.loadingController = null;
        }
      },
      getSelectedImageFiles: () => {
        return this.getSelectedImageFiles();
      },
      getSelectedTextFiles: () => {
        return this.getSelectedTextFiles();
      },
      addMessage: (message: Message) => {
        this.messages.push(message);
      },
      getRecentMessages: () => {
        return this.messages;
      },
      getSystemDetector: () => {
        return this.systemDetector;
      },
      getAbortSignal: () => {
        return this.abortController?.signal || null;
      }
    };

    this.messageHandler = new MessageHandler(this.currentMessages, messageHandlerCallbacks);

    // 监听语言变化
    languageService.onLanguageChange((language) => {
      this.updateLanguage();
    });

    // 监听配置变更
    this.configChangeListener = () => {
      // 在非聊天状态下刷新欢迎框显示
      if (this.chatState.canSendMessage && !this.chatState.isProcessing) {
        this.refreshWelcomeBox();
      }
    };
    StorageService.onConfigChange(this.configChangeListener);
  }

  // Destroy method, clean up all resources
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Remove config change listener
    if (this.configChangeListener) {
      StorageService.removeConfigChangeListener(this.configChangeListener);
      this.configChangeListener = null;
    }

    // 停止loading动画
    if (this.loadingController) {
      this.loadingController.stop();
      this.loadingController = null;
    }

    // 清理SystemDetector资源
    this.systemDetector.cleanup().catch(error => {
      // 忽略清理错误
    });

    // 重置聊天状态
    this.setChatState({ canSendMessage: false, isProcessing: false });

    // 清空消息
    this.messages = [];

    // 重置命令管理器状态
    this.commandManager.resetStates();

    // 清除选中文件列表
    this.clearSelectedFiles();

    // 清理stdin状态
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch (error) {
        // Ignore errors
      }
    }

    // Remove all possible event listeners
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('error');
    process.stdin.removeAllListeners('end');

    try {
      process.stdin.pause();
    } catch (error) {
      // Ignore errors
    }
  }

  private updateLanguage(): void {
    this.currentMessages = languageService.getMessages();
    this.commandManager.updateLanguage(this.currentMessages);
    this.helpManager.updateLanguage(this.currentMessages);
    this.responseManager.updateLanguage(this.currentMessages);
    this.inputHandler.updateLanguage(this.currentMessages);
    this.initHandler.updateLanguage(this.currentMessages);
    this.messageHandler.updateLanguage(this.currentMessages);
  }

  // Public API: Inject AI reply
  injectAIReply(content: string): void {
    // 停止loading动画
    if (this.loadingController) {
      this.loadingController.stop();
      this.loadingController = null;
    }

    this.messageHandler.injectAIReply(content);
  }

  // 公开API：设置聊天状态
  setChatState(state: Partial<ChatState>): void {
    this.chatState = { ...this.chatState, ...state };
  }

  // 公开API：获取聊天状态
  getChatState(): ChatState {
    return { ...this.chatState };
  }

  // 公开API：获取当前选中的图片文件列表
  getSelectedImageFiles(): string[] {
    return this.inputHandler.getSelectedImageFiles();
  }

  // 公开API：获取当前选中的文本文件列表
  getSelectedTextFiles(): string[] {
    return this.inputHandler.getSelectedTextFiles();
  }

  // 公开API：清除选中文件列表
  clearSelectedFiles(): void {
    this.inputHandler.clearSelectedFiles();
  }

  // 重新加载页面
  async reload(): Promise<void> {
    this.destroy();
    await this.show();
  }
  
  // 显示配置页面
  async showConfigPage(): Promise<void> {
    try {
      const configPage = new ConfigPage();
      await configPage.show();
      
      // 配置完成后返回聊天
      await this.reload();
    } catch (error) {
      console.error('Configuration error:', error);
      await this.reload();
    }
  }

  /**
   * 刷新欢迎框显示（配置变更时调用）
   */
  private refreshWelcomeBox(): void {
    if (this.isDestroyed || this.chatState.isProcessing) return;

    // 先清除屏幕上方的欢迎框区域（保留聊天历史）
    // 移动到顶部并清除前几行
    process.stdout.write('\x1B[H'); // 移动到屏幕顶部

    // 清除前15行（大致是欢迎框的高度）
    for (let i = 0; i < 15; i++) {
      process.stdout.write('\x1B[2K'); // 清除整行
      if (i < 14) {
        process.stdout.write('\x1B[1B'); // 下移一行
      }
    }

    // 返回到顶部重新显示欢迎框
    process.stdout.write('\x1B[H');
    this.showWelcomeBox();

    // 移动到最底部（继续输入位置）
    process.stdout.write('\x1B[999B');
  }

  /**
   * Show welcome box with enhanced design
   */
  private showWelcomeBox(): void {
    // Get current configuration info
    const currentDir = process.cwd();
    const apiConfig = StorageService.getApiConfig();

    // Simple banner for Catwalk CLI
    const asciiArt = chalk.cyan.bold('Catwalk AI Coding Assistant');

    // Configuration status with icons
    const hasConfig = apiConfig.apiKey && apiConfig.baseUrl;
    const statusIcon = hasConfig ? chalk.green('✓') : chalk.red('✗');
    const statusText = hasConfig ? chalk.green('Ready') : chalk.yellow('Not configured');

    const configLines = [
      chalk.gray('━'.repeat(50)),
      '',
      `${chalk.blue('📁')} ${chalk.gray('Directory:')} ${chalk.white(currentDir)}`,
      `${chalk.blue('🌐')} ${chalk.gray('API URL:')} ${chalk.white(apiConfig.baseUrl || chalk.dim('Not set'))}`,
      `${chalk.blue('🔑')} ${chalk.gray('API Key:')} ${chalk.white(apiConfig.apiKey ? StringUtils.maskApiKey(apiConfig.apiKey) : chalk.dim('Not set'))}`,
      `${chalk.blue('🤖')} ${chalk.gray('Model:')} ${chalk.white(apiConfig.model || chalk.dim('Not set'))}`,
      '',
      `${statusIcon} ${chalk.gray('Status:')} ${statusText}`,
      '',
      chalk.gray('━'.repeat(50)),
      '',
      chalk.dim('💡 Quick Tips:'),
      chalk.dim('  • Type /help for available commands'),
      chalk.dim('  • Press ESC twice to interrupt AI responses'),
      chalk.dim('  • Use /config to change settings'),
      chalk.dim('  • Press Ctrl+C to clear input, Ctrl+D to exit')
    ];

    // Welcome box - enhanced design
    const welcomeBox = boxen(
      asciiArt + '\n\n' +
      configLines.join('\n'),
      {
        padding: { top: 1, bottom: 1, left: 3, right: 3 },
        margin: { top: 1, bottom: 1, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: hasConfig ? 'cyan' : 'yellow',
        title: chalk.cyan.bold('Catwalk'),
        titleAlignment: 'center'
      }
    );

    console.log(welcomeBox);
  }

  async show(): Promise<void> {
    // 确保之前的状态已清理
    if (this.isDestroyed) {
      // 重新初始化
      this.isDestroyed = false;
      this.chatState = {
        canSendMessage: true,
        isProcessing: false
      };
      this.messages = [];
      this.commandManager.resetStates();
      this.loadingController = null;
    }

    // 强制清屏，确保完全清除欢迎页面内容
    process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
    process.stdout.write('\x1Bc');

    // 确保stdin处于正确状态
    try {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeAllListeners('data');
      process.stdin.removeAllListeners('error');
      process.stdin.removeAllListeners('end');
      process.stdin.pause();
    } catch (error) {
      // 忽略清理错误
    }

    // 显示欢迎框
    this.showWelcomeBox();

    // Show status bar
    const apiConfig = StorageService.getApiConfig();
    StatusBar.show({
      model: apiConfig.model || 'Not set',
      mode: 'normal',
      remoteUrl: StatusBar.getCurrentRepoUrl(),
      showExitHint: false
    });

    // Skip system detection display
    // await this.performSystemDetection();

    // 开始聊天循环
    await this.startChatLoop();
  }

  private async performSystemDetection(): Promise<void> {
    try {
      // 检测系统状态
      const detectionResult = await this.systemDetector.detectSystem();

      // 显示系统信息
      await this.systemDetector.displaySystemInfo(detectionResult);

      // 添加空行分隔，直接进入输入状态
      if (detectionResult.hasRole || detectionResult.hasMcpServices) {
        console.log(); // 添加空行分隔
      }
    } catch (error) {
      console.error('系统检测失败:', error);
      // 检测失败不影响后续流程，继续进入聊天
    }
  }

  private async startChatLoop(): Promise<void> {
    try {
      while (true) {
        // 检查是否已被销毁
        if (this.isDestroyed) {
          break;
        }

        // 检查是否可以发送消息
        if (!this.chatState.canSendMessage) {
          //process.stdout.write(chalk.red(this.currentMessages.main.status.cannotSendMessage + '\n'));
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // 获取用户输入
        const userInput = await this.getUserInput();

        // Handle /exit and /quit commands
        if (userInput === '/exit' || userInput === '/quit') {
          const exitAction = await this.commandManager.handleExitWithHistoryCheck(this.messages);
          if (exitAction !== 'cancel') {
            break;
          } else {
            continue; // 用户取消退出，继续聊天循环
          }
        }

        // 使用 CommandManager 处理用户输入
        const commandResult = await this.commandManager.handleInput(userInput, this.messages);

        if (commandResult.handled) {
          // Handle /config command
          if (commandResult.shouldShowConfig) {
            await this.showConfigPage();
            continue;
          }
          
          // 命令已被处理
          if (commandResult.shouldReload) {
            await this.reload();
            continue; // 重新加载后继续循环
          }
          if (commandResult.newMessages) {
            this.messages = commandResult.newMessages;
          }
          if (commandResult.shouldContinue) {
            continue;
          }
          if (commandResult.shouldExit) {
            break;
          }
        }

        // If CommandManager returns unhandled, it might be a normal message or message with file references
        if (!commandResult.handled) {
          // Check if it's a normal message
          if (!userInput.startsWith('/')) {
            // Add user message and display directly
            this.messageHandler.addUserMessage(userInput);

            // Start AI request with abort controller
            this.startAIRequest();

            // Process AI request
            try {
              await this.messageHandler.processAIRequest();
            } catch (error: any) {
              if (error.message === 'Request cancelled by user') {
                // Request was cancelled, continue to next input
                continue;
              }
              throw error; // Re-throw other errors
            } finally {
              // Clean up abort controller and interrupt handler
              this.abortController = null;

              if (this.interruptHandler) {
                this.interruptHandler.stop();
                this.interruptHandler = null;
              }
            }
            continue; // Continue to next loop
          }

          // 处理未被 commandManager.handleInput 捕获的其他命令
          switch (userInput) {
            case '/help':
              this.helpManager.showHelp(this.commandManager.getCommands());
              break;
            default:
              // 未知命令
              process.stdout.write(chalk.red(this.currentMessages.main.messages.unknownCommand.replace('{command}', userInput) + '\n'));
              break;
          }
          continue;
        }
      }
    } catch (error) {
      console.error('聊天循环出现错误:', error);
    } finally {
      // 确保在退出时清理所有资源
      this.destroy();
    }
  }

  private async getUserInput(): Promise<string> {
    // Check if already destroyed
    if (this.isDestroyed) {
      return '/exit';
    }

    return new Promise(async (resolve, reject) => {
      let currentInput = '';
      let cursorPosition = 0;
      let currentState: InputState | null = null;
      let isDestroyed = false;
      let lastSuggestionLines = 0;
      let escPressCount = 0;
      let escTimer: NodeJS.Timeout | null = null;
      let boxLines = 0; // Track how many lines the box uses

      // Box drawing characters
      const box = {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│'
      };

      // Render input line in a box
      const redrawInputLine = () => {
        if (isDestroyed) return;

        const terminalWidth = process.stdout.columns || 80;
        // Use 95% of terminal width, with min 40 and max 150
        const boxWidth = Math.min(Math.max(Math.floor(terminalWidth * 0.95), 40), 150);
        const contentWidth = boxWidth - 4; // Account for borders and padding

        // Clear previous box
        if (boxLines > 0) {
          // Move from current cursor position (content line) to top border line
          process.stdout.write(`\x1B[${boxLines - 2}A`);
          // Clear all box lines
          for (let i = 0; i < boxLines; i++) {
            process.stdout.write('\r\x1B[2K');
            if (i < boxLines - 1) process.stdout.write('\x1B[1B');
          }
          // Move back to top border line to start re-rendering
          process.stdout.write(`\x1B[${boxLines - 1}A\r`);
        }

        // Build new box
        const lines: string[] = [];

        // Top border
        lines.push(chalk.cyan(box.topLeft + box.horizontal.repeat(boxWidth - 2) + box.topRight));

        // Content line
        const promptText = chalk.cyan('> ');
        const displayText = currentInput || chalk.dim('Type your message...');
        const content = promptText + displayText;
        
        // Calculate actual display width (strip ANSI codes)
        const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*m/g, '');
        const actualWidth = StringUtils.getDisplayWidth(stripAnsi(content));
        const paddedContent = content + ' '.repeat(Math.max(0, contentWidth - actualWidth));
        lines.push(chalk.cyan(box.vertical) + ' ' + paddedContent + ' ' + chalk.cyan(box.vertical));

        // Bottom border
        lines.push(chalk.cyan(box.bottomLeft + box.horizontal.repeat(boxWidth - 2) + box.bottomRight));

        // Render
        process.stdout.write(lines.join('\n'));
        boxLines = lines.length;

        // Position cursor in the input area
        const promptWidth = 2; // "> "
        const cursorCol = 3 + promptWidth + cursorPosition; // 3 = "│ "
        process.stdout.write(`\x1B[${boxLines - 2}A`); // Move to content line
        process.stdout.write(`\x1B[${cursorCol}G`); // Move to cursor position
      };

      // Show initial box
      process.stdout.write('\n');
      redrawInputLine();

      // 显示建议列表
      const showSuggestions = (state: InputState) => {
        if (!state.showingSuggestions || state.suggestions.length === 0 || isDestroyed) return;

        const title = this.inputHandler.getSuggestionTitle(state.suggestionsType);
        const renderedSuggestions = this.inputHandler.renderSuggestions(
          state.suggestions,
          state.selectedIndex
        );

        // 计算建议列表需要的行数
        let suggestionLines = renderedSuggestions.length;
        if (title) suggestionLines += 1;

        // 输出建议列表
        process.stdout.write('\n');
        if (title) {
          process.stdout.write(title + '\n');
        }
        renderedSuggestions.forEach(suggestion => {
          process.stdout.write(suggestion + '\n');
        });

        // 更新建议行数追踪
        lastSuggestionLines = suggestionLines + 1; // +1 是因为开头的 \n
        // 向上移动回输入行 (don't redraw, already drawn by hideSuggestions)
        process.stdout.write(`\x1B[${lastSuggestionLines}A`);
      };

      // 隐藏建议列表
      const hideSuggestions = () => {
        if (isDestroyed || lastSuggestionLines === 0) return;

        // 向下移动到建议列表位置并清除
        process.stdout.write(`\x1B[${lastSuggestionLines}B`);
        
        // 向上清除每一行
        for (let i = 0; i < lastSuggestionLines; i++) {
          process.stdout.write('\x1B[1A\x1B[2K'); // 向上一行并清除
        }

        // 重置建议行数
        lastSuggestionLines = 0;
        
        // 重绘输入行(always needed after clearing)
        redrawInputLine();
      };

      // 更新显示
      const updateDisplay = async () => {
        if (isDestroyed) return;

        // 更新选中文件列表
        this.inputHandler.updateSelectedFiles(currentInput);

        // 总是先清除下方内容，避免残留（hideSuggestions 会重绘输入行）
        hideSuggestions();

        // 获取新状态
        const newState = await this.inputHandler.analyzInput(currentInput);
        currentState = newState;

        // 显示新建议（如果有）
        if (newState.showingSuggestions) {
          showSuggestions(newState);
        }
        // 注意：不需要 else 分支，因为 hideSuggestions 已经重绘了输入行
      };

      // 高效更新建议列表选中状态（避免完全重绘）
      const updateSuggestionSelection = (newIndex: number) => {
        if (!currentState?.showingSuggestions || isDestroyed) return;
        
        currentState.selectedIndex = newIndex;
        
        // Clear old suggestions and show new ones with updated selection
        if (lastSuggestionLines > 0) {
          // Move down to suggestions area
          process.stdout.write(`\x1B[${lastSuggestionLines}B`);
          
          // Clear each suggestion line
          for (let i = 0; i < lastSuggestionLines; i++) {
            process.stdout.write('\x1B[1A\x1B[2K');
          }
          
          // Reset counter
          lastSuggestionLines = 0;
        }
        
        // Show updated suggestions (will set lastSuggestionLines)
        showSuggestions(currentState);
      };

      // 清理函数
      const cleanup = () => {
        if (isDestroyed) return;
        isDestroyed = true;

        if (currentState?.showingSuggestions) {
          hideSuggestions();
        }
        
        // Clear the box
        if (boxLines > 0) {
          process.stdout.write(`\x1B[${boxLines - 1}A`);
          for (let i = 0; i < boxLines; i++) {
            process.stdout.write('\r\x1B[2K');
            if (i < boxLines - 1) process.stdout.write('\x1B[1B');
          }
          process.stdout.write(`\x1B[${boxLines - 1}A\r`);
          boxLines = 0;
        }

        // 移除所有事件监听器
        process.stdin.removeAllListeners('data');
        process.stdin.removeAllListeners('error');
        process.stdin.removeAllListeners('end');

        // 重置stdin状态
        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(false);
          } catch (error) {
            // 忽略错误，可能已经被重置
          }
        }

        // 暂停stdin
        try {
          process.stdin.pause();
        } catch (error) {
          // 忽略错误
        }

        // 移除进程退出监听器
        process.removeListener('SIGINT', handleExit);
        process.removeListener('SIGTERM', handleExit);
      };

      // 键盘事件处理
      const onKeyPress = async (key: string) => {
        if (isDestroyed) return;

        try {
          const keyCode = key.charCodeAt(0);

          // Ctrl+C - 优雅退出
          if (keyCode === 3) {
            cleanup();
            process.stdout.write('\n');
            const exitAction = await this.commandManager.handleExitWithHistoryCheck(this.messages);
            if (exitAction === 'cancel') {
              return;
            }
            resolve('/exit');
            return;
          }

          // Enter 键
          if (keyCode === 13) {
            if (currentState?.showingSuggestions && currentState.suggestions.length > 0) {
              // 选择当前高亮的建议
              const selectedSuggestion = currentState.suggestions[currentState.selectedIndex];
              const newInput = this.inputHandler.handleSuggestionSelection(currentInput, selectedSuggestion);

              if (selectedSuggestion.type === 'command') {
                // 命令类型直接执行
                if (currentState.showingSuggestions) {
                  hideSuggestions();
                }
                // Clear box and move to new line
                if (boxLines > 0) {
                  process.stdout.write(`\x1B[${boxLines}B\n`);
                }
                cleanup();
                resolve(newInput);
                return;
              } else {
                // 文件类型，更新输入内容
                if (currentState.showingSuggestions) {
                  hideSuggestions();
                }
                currentInput = newInput;
                cursorPosition = currentInput.length;
                redrawInputLine();
                await updateDisplay();
                return;
              }
            } else if (currentInput.trim()) {
              // 发送内容
              const finalInput = currentInput.trim();
              // Clear box and move to new line
              if (boxLines > 0) {
                process.stdout.write(`\x1B[${boxLines}B\n`);
              }
              cleanup();
              resolve(finalInput);
              return;
            } else {
              return;
            }
          }

          // Backspace 键
          if (keyCode === 127 || keyCode === 8) {
            if (currentInput.length > 0 && cursorPosition > 0) {
              if (currentState?.showingSuggestions) {
                hideSuggestions();
              }

              currentInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
              cursorPosition--;
              redrawInputLine();
              await updateDisplay();
            }
            return;
          }

          // 上下左右箭头键处理
          if (key.length >= 3 && key.startsWith('\x1B[')) {
            if (key === '\x1B[A') { // 上箭头
              if (currentState?.showingSuggestions && currentState.suggestions.length > 0) {
                const newIndex = currentState.selectedIndex > 0
                  ? currentState.selectedIndex - 1
                  : currentState.suggestions.length - 1;
                updateSuggestionSelection(newIndex);
              }
              return;
            } else if (key === '\x1B[B') { // 下箭头
              if (currentState?.showingSuggestions && currentState.suggestions.length > 0) {
                const newIndex = currentState.selectedIndex < currentState.suggestions.length - 1
                  ? currentState.selectedIndex + 1
                  : 0;
                updateSuggestionSelection(newIndex);
              }
              return;
            } else if (key === '\x1B[D') { // 左箭头
              if (cursorPosition > 0) {
                if (currentState?.showingSuggestions) {
                  hideSuggestions();
                  currentState.showingSuggestions = false;
                }
                cursorPosition--;
                if (!currentState?.showingSuggestions) {
                  redrawInputLine();
                }
              }
              return;
            } else if (key === '\x1B[C') { // 右箭头
              if (cursorPosition < currentInput.length) {
                if (currentState?.showingSuggestions) {
                  hideSuggestions();
                  currentState.showingSuggestions = false;
                }
                cursorPosition++;
                if (!currentState?.showingSuggestions) {
                  redrawInputLine();
                }
              }
              return;
            }
          }

          // ESC key handling - double press to clear input
          if (keyCode === 27 && key.length === 1) {
            // First, hide suggestions if showing
            if (currentState?.showingSuggestions) {
              hideSuggestions();
              currentState.showingSuggestions = false;
              currentState.suggestions = [];
              return;
            }

            // Handle double ESC to clear input
            if (escPressCount === 0) {
              if (currentInput === '') {
                return; // Nothing to clear
              }
              escPressCount = 1;

              // Show "Press ESC again to clear" prompt below the box
              // Move down past the box (3 lines) and show message
              process.stdout.write(`\x1B[${boxLines}B`);
              process.stdout.write('\n' + chalk.dim('Press ESC again to clear.'));
              // Move back up
              process.stdout.write(`\x1B[${boxLines + 1}A`);
              
              // Reset after 500ms
              if (escTimer) {
                clearTimeout(escTimer);
              }
              escTimer = setTimeout(() => {
                escPressCount = 0;
                escTimer = null;
                // Clear the prompt message below box
                process.stdout.write(`\x1B[${boxLines}B`);
                process.stdout.write('\n\x1B[2K');
                process.stdout.write(`\x1B[${boxLines + 1}A`);
              }, 500);
            } else {
              // Second ESC press - clear input
              if (escTimer) {
                clearTimeout(escTimer);
                escTimer = null;
              }
              escPressCount = 0;

              // Clear the prompt message below box
              process.stdout.write(`\x1B[${boxLines}B`);
              process.stdout.write('\n\x1B[2K');
              process.stdout.write(`\x1B[${boxLines + 1}A`);

              // Clear input
              currentInput = '';
              cursorPosition = 0;
              redrawInputLine();
            }
            return;
          }

          // 普通字符输入
          const isPrintable = (key.length === 1 && keyCode >= 32) || (key.length > 1 && !key.startsWith('\x1B'));

          if (isPrintable) {
            let textToInsert = key;

            // 处理粘贴内容 - 统一转换为单行
            if (key.includes('\n') || key.includes('\r') || key.length > 10) {
              const hasFileReference = currentInput.includes('@');
              
              if (hasFileReference) {
                textToInsert = StringUtils.processFileContentPaste(key);
              } else {
                // 所有多行内容都转换为单行
                textToInsert = key.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
              }
            }

            if (textToInsert) {
              if (currentState?.showingSuggestions) {
                hideSuggestions();
              }

              currentInput = currentInput.slice(0, cursorPosition) + textToInsert + currentInput.slice(cursorPosition);
              cursorPosition += textToInsert.length;
              redrawInputLine();
              await updateDisplay();
            }
          }
        } catch (error) {
          // 捕获任何异常，避免程序崩溃
          cleanup();
          reject(error);
        }
      };

      // 错误处理
      const onError = (error: Error) => {
        if (!isDestroyed) {
          cleanup();
          reject(error);
        }
      };

      // 进程退出处理
      const handleExit = () => {
        if (!isDestroyed) {
          cleanup();
          resolve('/exit');
        }
      };

      // 设置原始模式和事件监听
      try {
        // 确保stdin处于正确的状态
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        // 确保没有遗留的输入监听器，避免重复处理
        process.stdin.removeAllListeners('data');

        // 添加事件监听器
        process.stdin.on('data', onKeyPress);
        process.stdin.on('error', onError);

        // 添加进程退出监听，确保清理
        process.on('SIGINT', handleExit);
        process.on('SIGTERM', handleExit);

      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  /**
   * Start a new AI request with abort controller and interrupt handler
   */
  private startAIRequest(): void {
    this.abortController = new AbortController();

    // Create interrupt handler for ESC key
    this.interruptHandler = createInterruptHandler({
      onInterrupt: () => {
        this.cancelCurrentRequest();
      },
      onEscapePrompt: (show: boolean) => {
        // Could show/hide prompt in UI if needed
      }
    });

    // Start listening for ESC key
    this.interruptHandler.start();
  }

  /**
   * Cancel the current AI request
   */
  public cancelCurrentRequest(): void {
    // Stop interrupt handler
    if (this.interruptHandler) {
      this.interruptHandler.stop();
      this.interruptHandler = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;

      // Stop loading animation
      if (this.loadingController) {
        this.loadingController.stop();
        this.loadingController = null;
      }

      // Show cancellation message
      process.stdout.write('\n' + chalk.yellow('✗ Request cancelled by user') + '\n');

      // Reset chat state
      this.setChatState({
        canSendMessage: true,
        isProcessing: false
      });
    }
  }

  /**
   * Handle /init command
   */
  private async handleInitCommand(): Promise<void> {
    await this.initHandler.execute();
  }
}
