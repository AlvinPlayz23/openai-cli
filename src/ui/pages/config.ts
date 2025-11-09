import { checkbox, editor } from '@inquirer/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import { languageService } from '../../services/language';
import { McpConfig, McpFunctionConfirmationConfig, StorageService } from '../../services/storage';
import { AnimationUtils, StringUtils } from '../../utils';
import { InteractiveMenu, MenuChoice, NativeInput } from '../components';

export class ConfigPage {
  private readonly gradients = AnimationUtils.getGradients();

  async show(): Promise<void> {
    AnimationUtils.forceClearScreen();
    await this.showHeader();
    await this.showConfigMenu();
  }

  private async showHeader(): Promise<void> {
    // Modern header with gradient effect
    const header = boxen(
      chalk.cyan.bold('⚙  CATWALK CONFIGURATION') + '\n' +
      chalk.gray('Manage your AI assistant settings'),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        margin: { top: 1, bottom: 1, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'cyan',
        titleAlignment: 'center'
      }
    );

    console.log(header);
  }

  private async showConfigMenu(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    // Display current configuration status
    const statusBox = boxen(
      chalk.white.bold('Current Configuration:\n\n') +
      chalk.gray('API URL: ') + chalk.cyan(currentConfig.baseUrl || 'Not set') + '\n' +
      chalk.gray('API Key: ') + chalk.cyan(currentConfig.apiKey ? StringUtils.maskApiKey(currentConfig.apiKey) : 'Not set') + '\n' +
      chalk.gray('Context7 Key: ') + chalk.cyan(currentConfig.context7ApiKey ? StringUtils.maskApiKey(currentConfig.context7ApiKey) : 'Not set (optional)') + '\n' +
      chalk.gray('Model: ') + chalk.cyan(currentConfig.model || 'Not set') + '\n' +
      chalk.gray('Max Tokens: ') + chalk.cyan(String(currentConfig.contextTokens || '128000')),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        margin: { top: 0, bottom: 1, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'gray'
      }
    );
    console.log(statusBox);

    // Only show essential configuration options in TUI
    // Other settings remain in config file but are not shown in menu
    const choices: MenuChoice[] = [
      {
        name: chalk.blue('🌐 ') + 'Set API Base URL',
        value: 'baseUrl',
        description: 'Configure the OpenAI-compatible API endpoint'
      },
      {
        name: chalk.yellow('🔑 ') + 'Set API Key',
        value: 'apiKey',
        description: 'Configure your API authentication key'
      },
      {
        name: chalk.cyan('🔐 ') + 'Set Context7 API Key',
        value: 'context7ApiKey',
        description: 'Optional: API key for Context7 documentation service'
      },
      {
        name: chalk.green('🤖 ') + 'Set Default Model',
        value: 'model',
        description: 'Choose the AI model to use (e.g., gpt-4, claude-3-opus)'
      },
      {
        name: chalk.magenta('👤 ') + 'Set System Role',
        value: 'role',
        description: 'Define the AI assistant\'s behavior and personality'
      },
      {
        name: chalk.blue('🔌 ') + 'Edit MCP Config',
        value: 'mcpConfig',
        description: 'Configure Model Context Protocol servers'
      },
      {
        name: chalk.gray('👁  ') + 'View Current Config',
        value: 'viewConfig',
        description: 'Display all current configuration settings'
      },
      {
        name: chalk.green('🔗 ') + 'Test Connection',
        value: 'testConnection',
        description: 'Verify API connection and credentials'
      },
      {
        name: chalk.gray('← ') + 'Back to Main Menu',
        value: 'back',
        description: 'Return to the main chat interface'
      }
    ];

    const action = await InteractiveMenu.show({
      message: chalk.cyan('\nSelect configuration option:'),
      choices
    });

    await this.handleConfigAction(action);
  }

  private async handleConfigAction(action: string): Promise<void> {
    console.log();

    switch (action) {
      case 'baseUrl':
        await this.editBaseUrl();
        break;

      case 'apiKey':
        await this.editApiKey();
        break;

      case 'context7ApiKey':
        await this.editContext7ApiKey();
        break;

      case 'model':
        await this.editModel();
        break;

      case 'role':
        await this.editRole();
        break;

      case 'mcpConfig':
        await this.editMcpConfig();
        break;

      case 'viewConfig':
        await this.viewCurrentConfig();
        // Wait for user to review config
        console.log();
        await this.waitForEnter();
        break;

      case 'testConnection':
        await this.testConnection();
        console.log();
        await this.waitForEnter();
        break;

      case 'back':
        return; // Return to main menu

      default:
        console.log('  ' + chalk.red('Unknown action'));
    }

    // Return to config menu after action (except back)
    if (action !== 'back') {
      await this.show();
    }
  }

  private async editBaseUrl(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log();
    const infoBox = boxen(
      chalk.blue.bold('📡 API Base URL Configuration\n\n') +
      chalk.gray('Current: ') + chalk.cyan(currentConfig.baseUrl || 'Not set') + '\n\n' +
      chalk.dim(messages.config.menuDescription.baseUrl),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'blue'
      }
    );
    console.log(infoBox);
    console.log();

    try {
      const baseUrl = await NativeInput.url(
        chalk.blue('Enter API URL: '),
        currentConfig.baseUrl || messages.config.prompts.baseUrlPlaceholder
      );
      const result = { baseUrl };

      if (result.baseUrl && result.baseUrl.trim()) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveBaseUrl(result.baseUrl.trim());
        console.log('\n' + chalk.green('✓ Configuration saved successfully!') + '\n');
      }
    } catch (error) {
      console.log();
      return;
    }
  }

  private async editApiKey(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log();
    const infoBox = boxen(
      chalk.yellow.bold('🔑 API Key Configuration\n\n') +
      chalk.gray('Current: ') + chalk.cyan(currentConfig.apiKey ? StringUtils.maskApiKey(currentConfig.apiKey) : 'Not set') + '\n\n' +
      chalk.dim(messages.config.menuDescription.apiKey),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'yellow'
      }
    );
    console.log(infoBox);
    console.log();

    try {
      const apiKey = await NativeInput.text(chalk.yellow('Enter API Key: '));

      if (apiKey && apiKey.trim()) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveApiKey(apiKey.trim());
        console.log('\n' + chalk.green('✓ API Key saved successfully!') + '\n');
      }
    } catch (error) {
      console.log();
      return;
    }
  }

  private async editContext7ApiKey(): Promise<void> {
    const currentConfig = StorageService.getApiConfig();

    console.log();
    const infoBox = boxen(
      chalk.cyan.bold('🔐 Context7 API Key Configuration\n\n') +
      chalk.gray('Current: ') + chalk.cyan(currentConfig.context7ApiKey ? StringUtils.maskApiKey(currentConfig.context7ApiKey) : 'Not set') + '\n\n' +
      chalk.dim('Optional API key for Context7 documentation service.\nProvides higher rate limits and access to private repositories.\nGet your free key at: https://context7.com/dashboard'),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'cyan'
      }
    );
    console.log(infoBox);
    console.log();

    try {
      const apiKey = await NativeInput.text(chalk.cyan('Enter Context7 API Key (or leave empty to skip): '));

      if (apiKey && apiKey.trim()) {
        await AnimationUtils.showActionAnimation('Saving...');
        StorageService.saveContext7ApiKey(apiKey.trim());
        console.log('\n' + chalk.green('✓ Context7 API Key saved successfully!') + '\n');
      } else if (apiKey === '') {
        console.log('\n' + chalk.yellow('Context7 API Key not changed') + '\n');
      }
    } catch (error) {
      console.log();
      return;
    }
  }

  private async editModel(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log();
    const infoBox = boxen(
      chalk.green.bold('🤖 Model Configuration\n\n') +
      chalk.gray('Current: ') + chalk.cyan(currentConfig.model || 'Not set') + '\n\n' +
      chalk.dim(messages.config.menuDescription.model),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'green'
      }
    );
    console.log(infoBox);
    console.log();

    // Common models with cleaner display
    const commonModelChoices: MenuChoice[] = [
      { name: chalk.cyan('GPT-4.1') + chalk.dim(' (Latest)'), value: 'gpt-4.1' },
      { name: chalk.cyan('GPT-4o') + chalk.dim(' (Omni)'), value: 'gpt-4o' },
      { name: chalk.cyan('O3') + chalk.dim(' (Advanced)'), value: 'o3' },
      { name: chalk.cyan('O3-mini') + chalk.dim(' (Efficient)'), value: 'o3-mini' },
      { name: chalk.cyan('O4-mini') + chalk.dim(' (Latest Mini)'), value: 'o4-mini' },
      { name: chalk.yellow('✏ Custom model'), value: 'custom' },
      { name: chalk.gray('← Cancel'), value: 'cancel' }
    ];

    const modelChoice = await InteractiveMenu.show({
      message: chalk.green('Select model:'),
      choices: commonModelChoices
    });

    let finalModel = modelChoice;

    if (modelChoice === 'custom') {
      const model = await NativeInput.text(
        '  ' + messages.config.prompts.modelInput + ':',
        currentConfig.model || messages.config.prompts.modelPlaceholder
      );
      finalModel = model;
    }
    if (modelChoice === 'cancel') {
      return;
    }

    if (finalModel && finalModel.trim()) {
      await AnimationUtils.showActionAnimation(messages.config.actions.saving);
      StorageService.saveModel(finalModel.trim());
      console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));
    }
  }

  private async editContextTokens(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.contextTokens));
    console.log('  ' + chalk.gray(messages.config.menuDescription.contextTokens));

    if (currentConfig.contextTokens) {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${currentConfig.contextTokens}`));
    }
    console.log();

    try {
      const contextTokens = await NativeInput.number(
        '  ' + messages.config.prompts.contextTokensInput + ':',
        currentConfig.contextTokens || parseInt(messages.config.prompts.contextTokensPlaceholder),
        1000,
        2000000
      );

      if (contextTokens) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveContextTokens(contextTokens);
        console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));
      }
    } catch (error) {
      // 用户按 ESC 或 Ctrl+C 取消输入，直接返回
      console.log();
      return;
    }
  }

  private async editMaxConcurrency(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.maxConcurrency));
    console.log('  ' + chalk.gray(messages.config.menuDescription.maxConcurrency));

    if (currentConfig.maxConcurrency) {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${currentConfig.maxConcurrency}`));
    }
    console.log();

    try {
      const maxConcurrency = await NativeInput.number(
        '  ' + messages.config.prompts.maxConcurrencyInput + ':',
        currentConfig.maxConcurrency || parseInt(messages.config.prompts.maxConcurrencyPlaceholder),
        1,
        100
      );

      if (maxConcurrency) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveMaxConcurrency(maxConcurrency);
        console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));
      }
    } catch (error) {
      // 用户按 ESC 或 Ctrl+C 取消输入，直接返回
      console.log();
      return;
    }
  }

  private async editMcpConfig(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfigJson = StorageService.getMcpConfigJson();

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.mcpConfig));
    console.log('  ' + chalk.gray(messages.config.menuDescription.mcpConfig));

    if (currentConfigJson && currentConfigJson !== '{\n  "mcpServers": {}\n}') {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: `));
      const lines = currentConfigJson.split('\n');
      lines.slice(0, 5).forEach(line => {
        console.log('    ' + chalk.gray(line));
      });
      if (lines.length > 5) {
        console.log('    ' + chalk.gray('...'));
      }
    }
    console.log();
    console.log('  ' + chalk.gray(messages.config.messages.mcpConfigEditorPrompt));

    try {
      const mcpConfigJson = await editor({
        message: '  ' + messages.config.prompts.mcpConfigInput + ':',
        default: currentConfigJson || messages.config.prompts.mcpConfigPlaceholder,
        validate: (input: string) => {
          if (!input.trim()) {
            return messages.config.messages.invalidInput;
          }

          // 使用新的验证方法
          const validation = StorageService.validateMcpConfigJson(input.trim());
          if (!validation.isValid) {
            return validation.error || messages.config.messages.invalidJson;
          }

          return true;
        }
      });

      // 重置终端状态，防止影响后续交互
      this.resetTerminalState();

      if (mcpConfigJson && mcpConfigJson.trim()) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);

        // 验证并保存配置
        const validation = StorageService.validateMcpConfigJson(mcpConfigJson.trim());
        if (validation.isValid && validation.parsedConfig) {
          StorageService.saveMcpConfig(validation.parsedConfig);

          // 显示保存成功消息
          console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));

          // 如果有系统服务被恢复，显示额外信息
          if (validation.hasSystemUpdates && validation.restoredServices && validation.restoredServices.length > 0) {
            console.log('  ' + chalk.yellow('ℹ ' + messages.config.messages.mcpSystemServicesRestored));
            validation.restoredServices.forEach(serviceName => {
              console.log('    ' + chalk.gray(`- ${serviceName} (${messages.systemDetector.builtinServices.protected})`));
            });
          }
        }
      }
    } catch (error) {
      // 用户按 ESC 或 Ctrl+C 取消输入，也需要重置终端状态
      this.resetTerminalState();
      console.log();
      return;
    }
  }

  private async editMcpFunctionConfirmation(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getMcpFunctionConfirmationConfig();

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.mcpFunctionConfirmation));
    console.log('  ' + chalk.gray(messages.config.menuDescription.mcpFunctionConfirmation));
    console.log();

    try {
      // 获取所有可用的MCP函数（包括内置和外部）
      await AnimationUtils.showActionAnimation('Detecting and connecting MCP services...', 500);

      // 使用SystemDetector获取所有工具定义
      const { SystemDetector } = await import('../../services/system-detector');
      const systemDetector = new SystemDetector();

      try {
        // 先执行完整的系统检测，这会连接所有MCP服务器
        const detectionResult = await systemDetector.detectSystem();

        // 然后获取所有工具定义
        const allToolDefinitions = await systemDetector.getAllToolDefinitions();

        if (!allToolDefinitions || allToolDefinitions.length === 0) {
          console.log('  ' + chalk.yellow(messages.config.messages.noMcpFunctionsFound));
          console.log('  ' + chalk.gray('Please configure MCP servers first, or check if MCP servers are running.'));

          // 显示检测到的服务器状态
          if (detectionResult.mcpServers && detectionResult.mcpServers.length > 0) {
            console.log();
            console.log('  ' + chalk.gray('MCP server status:'));
            detectionResult.mcpServers.forEach(server => {
              const statusIcon = server.status === 'connected' ? chalk.green('✓') : chalk.red('✗');
              const toolsInfo = server.tools ? ` (${server.tools.length} tools)` : ' (no tools)';
              console.log(`    ${statusIcon} ${server.name}: ${server.status}${toolsInfo}`);
              if (server.error) {
                console.log(`      ${chalk.gray('Error:')} ${chalk.red(server.error)}`);
              }
            });
          }
          return;
        }

        console.log('  ' + chalk.green(`✓ Found ${allToolDefinitions.length} MCP functions`));

        // 显示服务器连接状态
        if (detectionResult.mcpServers && detectionResult.mcpServers.length > 0) {
          const connectedServers = detectionResult.mcpServers.filter(s => s.status === 'connected');
          const totalTools = detectionResult.mcpServers.reduce((sum, s) => sum + (s.tools?.length || 0), 0);
          console.log('  ' + chalk.gray(`Connected ${connectedServers.length}/${detectionResult.mcpServers.length} servers, ${totalTools} tools`));
        }
        console.log();

        // 创建复选框选项
        const checkboxOptions = allToolDefinitions.map(toolDef => {
          const functionName = toolDef.function.name;
          const description = toolDef.function.description || 'No description available';

          // 提取服务器名（从函数名中）
          const serverName = functionName.includes('_') ? functionName.split('_')[0] : 'unknown';

          return {
            name: `[${serverName}] ${functionName} - ${description.length > 50 ? description.substring(0, 50) + '...' : description}`,
            value: functionName,
            checked: currentConfig[functionName] === true
          };
        });

        // 显示当前配置状态
        const confirmedFunctions = Object.keys(currentConfig).filter(key => currentConfig[key] === true);
        if (confirmedFunctions.length > 0) {
          console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${confirmedFunctions.length} ${messages.config.labels.configured}`));
          confirmedFunctions.forEach(funcName => {
            console.log('    ' + chalk.green('✓ ') + chalk.gray(funcName));
          });
        } else {
          console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${messages.config.labels.notConfigured}`));
        }
        console.log();

        // 显示操作说明
        console.log('  ' + chalk.yellow(messages.config.messages.mcpFunctionConfirmationInstructions));
        console.log();

        // 使用复选框让用户选择
        const selectedFunctions = await checkbox({
          message: '  ' + messages.config.prompts.mcpFunctionConfirmationPrompt + ':',
          choices: checkboxOptions,
          pageSize: 10,
          loop: false, // 禁用无限滚动
          validate: (answer) => {
            // 允许空选择，表示所有函数都不需要确认
            return true;
          },
          // 添加自定义指令
          instructions: false // 禁用默认指令，我们已经显示了自定义指令
        });

        // 重置终端状态
        this.resetTerminalState();

        // 构建新的配置
        const newConfig: McpFunctionConfirmationConfig = {};

        // 先将所有函数设为不需要确认
        allToolDefinitions.forEach(toolDef => {
          const functionName = toolDef.function.name;
          newConfig[functionName] = false;
        });

        // 然后将选中的函数设为需要确认
        selectedFunctions.forEach(functionName => {
          newConfig[functionName] = true;
        });

        // 保存配置
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveMcpFunctionConfirmationConfig(newConfig);

        // 显示保存结果
        console.log('  ' + chalk.green('✓ ' + messages.config.messages.mcpFunctionConfirmationSaved));

        if (selectedFunctions.length > 0) {
          console.log('  ' + chalk.gray(`${selectedFunctions.length} functions need to be confirmed manually.`));
          selectedFunctions.forEach(funcName => {
            console.log('    ' + chalk.green('✓ ') + chalk.white(funcName));
          });
        } else {
          console.log('  ' + chalk.gray('All MCP functions will execute automatically without confirmation.'));
        }

        // 清理SystemDetector资源
        await systemDetector.cleanup();

      } catch (mcpError) {
        console.log('  ' + chalk.yellow(`Failed to retrieve MCP function list: ${mcpError instanceof Error ? mcpError.message : String(mcpError)}`));
        console.log('  ' + chalk.gray('Please ensure that the MCP service is configured correctly and the server is running.'));
        return;
      }

    } catch (error) {
      // 用户按 ESC 或 Ctrl+C 取消输入，也需要重置终端状态
      this.resetTerminalState();
      console.log();
      return;
    }
  }

  private async editMaxToolCalls(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.maxToolCalls));
    console.log('  ' + chalk.gray(messages.config.menuDescription.maxToolCalls));

    if (currentConfig.maxToolCalls) {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${currentConfig.maxToolCalls}`));
    }
    console.log();

    try {
      const maxToolCalls = await NativeInput.number(
        '  ' + messages.config.prompts.maxToolCallsInput + ':',
        currentConfig.maxToolCalls || parseInt(messages.config.prompts.maxToolCallsPlaceholder),
        1,
        100
      );

      if (maxToolCalls) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveMaxToolCalls(maxToolCalls);
        console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));
      }
    } catch (error) {
      // 用户按 ESC 或 Ctrl+C 取消输入，直接返回
      console.log();
      return;
    }
  }

  private async editRole(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.role));
    console.log('  ' + chalk.gray(messages.config.menuDescription.role));

    if (currentConfig.role) {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: `));
      console.log('    ' + chalk.gray(currentConfig.role.split('\n').join('\n    ')));
    }
    console.log();
    console.log('  ' + chalk.gray(messages.config.messages.roleEditorPrompt));

    try {
      const role = await editor({
        message: '  ' + messages.config.prompts.roleInput + ':',
        default: currentConfig.role || messages.config.prompts.rolePlaceholder,
        validate: (input: string) => {
          if (!input.trim()) {
            return messages.config.messages.invalidInput;
          }
          return true;
        }
      });

      // 重置终端状态，防止影响后续交互
      this.resetTerminalState();

      if (role && role.trim()) {
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveRole(role.trim());
        console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));
      }
    } catch (error) {
      // 用户按 ESC 或 Ctrl+C 取消输入，也需要重置终端状态
      this.resetTerminalState();
      console.log();
      return;
    }
  }

  /**
 * 重置终端状态，防止editor等外部工具影响后续交互
 */
  private resetTerminalState(): void {
    // 恢复光标显示
    process.stdout.write('\x1B[?25h');

    // 确保stdin处于正确状态，让InteractiveMenu能正常工作
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      // 立即resume，让后续的InteractiveMenu可以正常接管
      process.stdin.resume();
    }
  }

  private async viewCurrentConfig(): Promise<void> {
    const messages = languageService.getMessages();

    console.log('  ' + chalk.cyan.bold(messages.config.messages.currentConfig));
    console.log('  ' + chalk.gray('─'.repeat(40)));
    console.log();

    await AnimationUtils.showActionAnimation(messages.config.actions.loading, 0);

    const config = StorageService.getApiConfig();

    if (!StorageService.hasConfig()) {
      console.log('  ' + chalk.yellow(messages.config.messages.noConfigFound));
      return;
    }

    // 显示配置状态
    this.displayConfigItem(
      messages.config.labels.baseUrl,
      config.baseUrl,
      config.baseUrl ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    this.displayConfigItem(
      messages.config.labels.apiKey,
      config.apiKey ? StringUtils.maskApiKey(config.apiKey) : undefined,
      config.apiKey ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    this.displayConfigItem(
      messages.config.labels.model,
      config.model,
      config.model ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    this.displayConfigItem(
      messages.config.labels.contextTokens,
      config.contextTokens?.toString(),
      config.contextTokens ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    this.displayConfigItem(
      messages.config.labels.maxConcurrency,
      config.maxConcurrency?.toString(),
      config.maxConcurrency ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    this.displayConfigItem(
      messages.config.labels.maxToolCalls,
      config.maxToolCalls?.toString(),
      config.maxToolCalls ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    this.displayConfigItem(
      messages.config.labels.role,
      config.role,
      config.role ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    const mcpConfig = StorageService.getMcpConfig();
    const serverNames = Object.keys(mcpConfig.mcpServers);
    const hasMcpServers = serverNames.length > 0;

    let mcpDisplayValue: string | undefined;
    if (hasMcpServers) {
      // 显示服务器名称列表，如果太多则显示前几个
      if (serverNames.length <= 3) {
        mcpDisplayValue = serverNames.join(', ');
      } else {
        mcpDisplayValue = `${serverNames.slice(0, 2).join(', ')} +${serverNames.length - 2} more`;
      }
    }

    // MCP配置需要特殊处理，显示更详细的信息
    if (hasMcpServers) {
      this.displayMcpConfigItem(messages.config.labels.mcpConfig, mcpConfig, messages.config.labels.configured);
    } else {
      this.displayConfigItem(
        messages.config.labels.mcpConfig,
        mcpDisplayValue,
        messages.config.labels.notConfigured
      );
    }

    // 显示MCP函数确认配置
    const mcpFunctionConfig = StorageService.getMcpFunctionConfirmationConfig();
    const confirmedFunctions = Object.keys(mcpFunctionConfig).filter(key => mcpFunctionConfig[key] === true);

    let mcpFunctionDisplayValue: string | undefined;
    if (confirmedFunctions.length > 0) {
      if (confirmedFunctions.length <= 3) {
        mcpFunctionDisplayValue = confirmedFunctions.join(', ');
      } else {
        mcpFunctionDisplayValue = `${confirmedFunctions.slice(0, 2).join(', ')} +${confirmedFunctions.length - 2} more`;
      }
    }

    this.displayConfigItem(
      messages.config.labels.mcpFunctionConfirmation,
      mcpFunctionDisplayValue,
      confirmedFunctions.length > 0 ? messages.config.labels.configured : messages.config.labels.notConfigured
    );



    const terminalSensitiveWords = config.terminalSensitiveWords || [];
    let terminalWordsDisplayValue: string | undefined;
    if (terminalSensitiveWords.length > 0) {
      if (terminalSensitiveWords.length <= 5) {
        terminalWordsDisplayValue = terminalSensitiveWords.join(', ');
      } else {
        terminalWordsDisplayValue = `${terminalSensitiveWords.slice(0, 5).join(', ')} +${terminalSensitiveWords.length - 5} more`;
      }
    }

    this.displayConfigItem(
      messages.config.labels.terminalSensitiveWords,
      terminalWordsDisplayValue,
      terminalSensitiveWords.length > 0 ? messages.config.labels.configured : messages.config.labels.notConfigured
    );

    console.log();

    // 显示配置完整性状态
    const validation = StorageService.validateApiConfig();
    if (validation.isValid) {
      console.log('  ' + chalk.green('✓ ' + messages.config.messages.allConfigured));
    } else {
      console.log('  ' + chalk.yellow(`⚠ Missing: ${validation.missing.join(', ')}`));
    }
  }

  private displayConfigItem(label: string, value: string | undefined, status: string): void {
    const statusColor = value ? chalk.green : chalk.yellow;

    console.log('  ' + chalk.white.bold(label + ':'));

    if (value) {
      // 对于多行内容，特别是role，进行特殊处理
      if (label.includes('角色') || label.includes('Role')) {
        console.log('    ' + chalk.gray('Value: '));
        const lines = value.split('\n');
        lines.forEach(line => {
          console.log('      ' + chalk.white(line));
        });
      } else {
        console.log('    ' + chalk.gray('Value: ') + chalk.white(value));
      }
    } else {
      console.log('    ' + chalk.gray('Value: ') + chalk.gray('(not set)'));
    }

    console.log('    ' + chalk.gray('Status: ') + statusColor(status));
    console.log();
  }

  private displayMcpConfigItem(label: string, mcpConfig: McpConfig, status: string): void {
    const statusColor = chalk.green;
    const messages = languageService.getMessages();
    console.log('  ' + chalk.white.bold(label + ':'));
    console.log('    ' + chalk.gray('Servers: '));

    // 显示每个MCP服务器的详细信息
    Object.entries(mcpConfig.mcpServers).forEach(([serverName, serverConfig]) => {
      // 判断是否为系统自带服务
      const isBuiltIn = serverConfig.transport === 'builtin' ||
        (serverName === 'file-system' && serverConfig.description?.includes('Unified file system service'));
      const serverIcon = isBuiltIn ? chalk.green('●') : chalk.cyan('●');
      const serverLabel = isBuiltIn ? chalk.white.bold(serverName) + chalk.gray(' (' + messages.systemDetector.builtinServices.name + ')') : chalk.white.bold(serverName);

      console.log('      ' + serverIcon + ' ' + serverLabel);

      // 智能检测服务器类型并显示相应信息
      if (serverConfig.transport === 'builtin') {
        // 内置服务
        console.log('        ' + chalk.gray('Type: ') + chalk.green('BUILTIN'));
        console.log('        ' + chalk.gray('Status: ') + chalk.green(messages.systemDetector.builtinServices.running));
      } else if (serverConfig.url) {
        // HTTP/HTTPS类型的服务器
        console.log('        ' + chalk.gray('Type: ') + chalk.white('HTTP'));
        console.log('        ' + chalk.gray('URL: ') + chalk.white(serverConfig.url));
      } else if (serverConfig.command) {
        // STDIO类型的服务器
        console.log('        ' + chalk.gray('Type: ') + chalk.white('STDIO'));
        if (!isBuiltIn) {
          // 只有非系统服务才显示详细的command和args
          console.log('        ' + chalk.gray('Command: ') + chalk.white(serverConfig.command));
          if (serverConfig.args && Array.isArray(serverConfig.args)) {
            console.log('        ' + chalk.gray('Args: ') + chalk.white(serverConfig.args.join(' ')));
          }
        }
      } else if (serverConfig.transport) {
        // 其他传输类型
        console.log('        ' + chalk.gray('Type: ') + chalk.white(serverConfig.transport.toUpperCase()));
      } else {
        // 未知类型，显示原始配置
        console.log('        ' + chalk.gray('Type: ') + chalk.yellow('Unknown'));
      }

      // 显示描述信息
      if (serverConfig.description) {
        console.log('        ' + chalk.gray('Description: ') + chalk.white(serverConfig.description));
      }

      // 显示其他配置信息（排除已经显示的主要字段）
      const excludeKeys = ['url', 'command', 'args', 'transport', 'description'];
      const extraConfig = Object.entries(serverConfig).filter(([key]) => !excludeKeys.includes(key));

      if (extraConfig.length > 0 && !isBuiltIn) {
        // 系统自带服务不显示复杂的配置细节
        extraConfig.forEach(([key, value]) => {
          let displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          // 如果是token类似的敏感信息，进行部分隐藏
          if (key.toLowerCase().includes('token') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password')) {
            displayValue = displayValue.length > 10 ? displayValue.substring(0, 8) + '...' : displayValue;
          }
          console.log('        ' + chalk.gray(`${key}: `) + chalk.white(displayValue));
        });
      }
    });

    console.log('    ' + chalk.gray('Status: ') + statusColor(status));
    console.log();
  }

  /**
   * 等待用户按Enter键，避免与InteractiveMenu的终端状态冲突
   */
  private async waitForEnter(): Promise<void> {
    return new Promise((resolve) => {
      console.log('  ' + chalk.gray('Press Enter to continue...'));

      // 确保stdin处于正确状态
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const cleanup = () => {
        // 重要：不要在这里设置setRawMode(false)，让InteractiveMenu自己管理
        process.stdin.removeListener('data', keyHandler);
        process.stdin.pause();
      };

      const keyHandler = (key: string) => {
        switch (key) {
          case '\r': // 回车
          case '\n':
            cleanup();
            resolve();
            break;
          case '\u0003': // Ctrl+C
            cleanup();
            process.exit();
            break;
          // 忽略其他按键，只响应Enter和Ctrl+C
        }
      };

      process.stdin.on('data', keyHandler);
    });
  }



  private async editTerminalSensitiveWords(): Promise<void> {
    const messages = languageService.getMessages();
    const currentConfig = StorageService.getApiConfig();
    const currentWords = currentConfig.terminalSensitiveWords || [];

    console.log('  ' + chalk.cyan.bold(messages.config.menuOptions.terminalSensitiveWords));
    console.log('  ' + chalk.gray(messages.config.menuDescription.terminalSensitiveWords));

    if (currentWords.length > 0) {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${currentWords.length} words configured`));
      currentWords.slice(0, 5).forEach(word => {
        console.log('    ' + chalk.gray(`- ${word}`));
      });
      if (currentWords.length > 5) {
        console.log('    ' + chalk.gray('...'));
      }
    } else {
      console.log('  ' + chalk.gray(`${messages.config.labels.status}: ${messages.config.labels.notConfigured}`));
    }
    console.log();
    console.log('  ' + chalk.gray(messages.config.messages.terminalSensitiveWordsEditorPrompt));

    try {
      const wordsString = await editor({
        message: '  ' + messages.config.prompts.terminalSensitiveWordsInput + ':',
        default: currentWords.join('\n'),
        validate: (input: string) => {
          return true;
        }
      });

      this.resetTerminalState();

      if (wordsString !== undefined) {
        const newWords = wordsString.split('\n').map(w => w.trim()).filter(w => w.length > 0);
        await AnimationUtils.showActionAnimation(messages.config.actions.saving);
        StorageService.saveTerminalSensitiveWords(newWords);
        console.log('  ' + chalk.green('✓ ' + messages.config.messages.configSaved));
      }
    } catch (error) {
      this.resetTerminalState();
      console.log();
      return;
    }
  }

  /**
   * Test API connection
   */
  private async testConnection(): Promise<void> {
    const currentConfig = StorageService.getApiConfig();

    console.log();
    const testBox = boxen(
      chalk.green.bold('🔗 Testing API Connection\n\n') +
      chalk.gray('Endpoint: ') + chalk.cyan(currentConfig.baseUrl || 'Not set') + '\n' +
      chalk.gray('Model: ') + chalk.cyan(currentConfig.model || 'Not set'),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderStyle: 'round',
        borderColor: 'green'
      }
    );
    console.log(testBox);
    console.log();

    // Check if required config is set
    if (!currentConfig.baseUrl || !currentConfig.apiKey) {
      const errorBox = boxen(
        chalk.red.bold('✗ Configuration Incomplete\n\n') +
        chalk.gray('Please set both API Base URL and API Key before testing connection.'),
        {
          padding: { top: 0, bottom: 0, left: 2, right: 2 },
          borderStyle: 'round',
          borderColor: 'red'
        }
      );
      console.log(errorBox);
      return;
    }

    // Show loading animation
    const loadingController = AnimationUtils.showLoadingAnimation({
      text: 'Testing connection...',
      interval: 150
    });

    try {
      // Import OpenAI service
      const { OpenAIService } = await import('../../services/openai');
      const openAIService = OpenAIService.getInstance();

      // Make a simple test request
      await openAIService.testConnection();

      // Stop loading
      loadingController.stop();

      // Show success
      const successBox = boxen(
        chalk.green.bold('✓ Connection Successful!\n\n') +
        chalk.gray('Your API credentials are valid and the connection is working.'),
        {
          padding: { top: 0, bottom: 0, left: 2, right: 2 },
          borderStyle: 'round',
          borderColor: 'green'
        }
      );
      console.log(successBox);
    } catch (error: any) {
      // Stop loading
      loadingController.stop();

      // Show error
      const errorBox = boxen(
        chalk.red.bold('✗ Connection Failed\n\n') +
        chalk.gray('Error: ') + chalk.red(error.message || 'Unknown error') + '\n\n' +
        chalk.dim('Please check your API Base URL and API Key.'),
        {
          padding: { top: 0, bottom: 0, left: 2, right: 2 },
          borderStyle: 'round',
          borderColor: 'red'
        }
      );
      console.log(errorBox);
    }
  }

  private async resetConfig(): Promise<void> {
    const messages = languageService.getMessages();

    console.log('  ' + chalk.yellow.bold(messages.config.menuOptions.resetConfig));
    console.log('  ' + chalk.gray(messages.config.menuDescription.resetConfig));
    console.log();

    const confirmationChoices: MenuChoice[] = [
      { name: messages.config.actions.yes, value: 'yes' },
      { name: messages.config.actions.no, value: 'no' }
    ];

    const confirmation = await InteractiveMenu.show({
      message: '  ' + messages.config.prompts.confirmReset,
      choices: confirmationChoices
    });

    if (confirmation === 'yes') {
      await AnimationUtils.showActionAnimation(messages.config.actions.resetting);
      StorageService.clearConfig();
      console.log('  ' + chalk.green('✓ ' + messages.config.messages.configReset));
    } else {
      console.log('  ' + chalk.gray(messages.config.messages.resetCancelled));
    }
  }
}