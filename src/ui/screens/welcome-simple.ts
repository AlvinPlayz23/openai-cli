/**
 * Simple Welcome Screen - Minimal version without fancy animations
 * Clean and fast startup experience
 */

import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import { languageService } from '../../services/language';
import { StorageService } from '../../services/storage';
import { updateChecker } from '../../services/update-checker';
import { Language } from '../../types/language';
import { InteractiveMenu, MenuChoice } from '../components/menu';
import { ConfigPage } from '../pages/config';
import { HelpPage } from '../pages/help';
import { MainPage } from '../pages/main';

const packageJson = require('../../../package.json');

export class SimpleWelcomeScreen {
  /**
   * Get version from package.json
   */
  private getVersion(): string {
    try {
      return packageJson.version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  }

  async show(): Promise<void> {
    this.showHeader();
    
    // Check for updates silently
    await this.checkForUpdates();
    
    await this.showMainMenu();
  }

  /**
   * Show simple header
   */
  private showHeader(): void {
    console.clear();
    console.log();
    console.log(chalk.cyan.bold('  ╔═╗╔═╗╔═╗╔╗╔╔═╗╦  ╔═╗╦  ╦'));
    console.log(chalk.cyan.bold('  ║ ║╠═╝║╣ ║║║╠═╣║  ║  ║  ║'));
    console.log(chalk.cyan.bold('  ╚═╝╩  ╚═╝╝╚╝╩ ╩╩  ╚═╝╩═╝╩'));
    console.log();
    console.log(chalk.dim('  AI-Powered Coding Assistant'));
    console.log(chalk.dim(`  Version ${this.getVersion()}`));
    console.log();
    console.log(chalk.gray('  ─'.repeat(40)));
    console.log();
  }

  /**
   * Check for updates silently
   */
  private async checkForUpdates(): Promise<void> {
    try {
      const updateInfo = await updateChecker.checkForUpdates();

      if (updateInfo.hasUpdate) {
        const shouldUpdate = await updateChecker.showUpdatePrompt(updateInfo);

        if (shouldUpdate) {
          await updateChecker.performUpdate();
          
          const messages = languageService.getMessages();
          await input({
            message: '  ' + chalk.gray(messages.welcome.actions.pressEnter)
          });
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Show main menu
   */
  private async showMainMenu(): Promise<void> {
    const messages = languageService.getMessages();

    const choices: MenuChoice[] = [
      {
        name: messages.welcome.menuOptions.start,
        value: 'start',
        description: messages.welcome.menuDescription.start
      },
      {
        name: messages.welcome.menuOptions.config,
        value: 'config',
        description: messages.welcome.menuDescription.config
      },
      {
        name: messages.welcome.menuOptions.language,
        value: 'language',
        description: messages.welcome.menuDescription.language
      },
      {
        name: messages.welcome.menuOptions.help,
        value: 'help',
        description: messages.welcome.menuDescription.help
      },
      {
        name: messages.welcome.menuOptions.exit,
        value: 'exit',
        description: messages.welcome.menuDescription.exit
      }
    ];

    const action = await InteractiveMenu.show({
      message: messages.welcome.menuPrompt + ':',
      choices
    });

    await this.handleMenuSelection(action);
  }

  /**
   * Handle menu selection
   */
  private async handleMenuSelection(action: string): Promise<void> {
    const messages = languageService.getMessages();
    console.log();

    switch (action) {
      case 'start':
        try {
          // Check config
          const configValidation = StorageService.validateApiConfig();

          if (!configValidation.isValid) {
            const shouldGoToConfig = await this.showConfigWarning(configValidation.missing);

            if (shouldGoToConfig) {
              const configPage = new ConfigPage();
              await configPage.show();
              await this.ensureTerminalReset();
              await this.show();
            } else {
              await this.show();
            }
            return;
          }

          // Start main page
          const mainPage = new MainPage();
          await mainPage.show();
          mainPage.destroy();
          await this.show();
        } catch (error) {
          console.error('  ' + chalk.red('Error:'), error);
          await this.show();
        }
        return;

      case 'config':
        const configPage = new ConfigPage();
        await configPage.show();
        await this.ensureTerminalReset();
        await this.show();
        return;

      case 'language':
        await this.handleLanguageSelection();
        return;

      case 'help':
        const helpPage = new HelpPage();
        await helpPage.show();
        console.log();
        await input({
          message: '  ' + chalk.gray(messages.welcome.actions.pressEnter)
        });
        await this.show();
        return;

      case 'exit':
        console.log();
        console.log('  ' + chalk.cyan('Goodbye! 👋'));
        console.log();
        process.exit(0);

      default:
        console.log('  ' + chalk.red(messages.welcome.actions.unknownAction));
        await this.showMainMenu();
    }
  }

  /**
   * Handle language selection
   */
  private async handleLanguageSelection(): Promise<void> {
    const choices = languageService.createLanguageMenuChoices();

    const selectedLanguage = await InteractiveMenu.show({
      message: 'Select Language / 选择语言:',
      choices
    }) as Language;

    const currentLanguage = languageService.getCurrentLanguage();
    if (selectedLanguage !== currentLanguage) {
      languageService.setLanguage(selectedLanguage);
      await this.show();
    } else {
      await this.showMainMenu();
    }
  }

  /**
   * Show config warning
   */
  private async showConfigWarning(missingItems: string[]): Promise<boolean> {
    const messages = languageService.getMessages();
    const configCheck = messages.welcome.configCheck;

    console.log();
    console.log('  ' + chalk.yellow.bold(configCheck.incompleteConfig));
    console.log();
    console.log('  ' + chalk.gray(configCheck.missingItems));

    missingItems.forEach(item => {
      let itemName = '';
      switch (item) {
        case 'baseUrl':
          itemName = configCheck.baseUrl;
          break;
        case 'apiKey':
          itemName = configCheck.apiKey;
          break;
        case 'model':
          itemName = configCheck.model;
          break;
      }
      console.log('    ' + chalk.red(itemName));
    });

    console.log();

    const choices: MenuChoice[] = [
      {
        name: configCheck.goToConfig,
        value: 'config',
        description: messages.welcome.menuDescription.config
      },
      {
        name: configCheck.backToMenu,
        value: 'back',
        description: messages.welcome.menuDescription.backToMenu
      }
    ];

    const choice = await InteractiveMenu.show({
      message: '  ' + configCheck.prompt,
      choices
    });

    return choice === 'config';
  }

  /**
   * Ensure terminal reset
   */
  private async ensureTerminalReset(): Promise<void> {
    process.stdout.write('\x1B[?25h');

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      await new Promise(resolve => setTimeout(resolve, 100));
      process.stdin.resume();
    }
  }
}

