import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import { languageService } from '../../services/language';
import { StorageService } from '../../services/storage';
import { updateChecker } from '../../services/update-checker';
import { Language } from '../../types/language';
import { AnimationUtils } from '../../utils/animation';
import { InteractiveMenu, MenuChoice } from '../components/menu';
import { ConfigPage } from '../pages/config';
import { HelpPage } from '../pages/help';
import { MainPage } from '../pages/main';

const packageJson = require('../../../package.json');

export class WelcomeScreen {
  private readonly gradients = AnimationUtils.getGradients();
  
  /**
   * Reads the version from package.json
   */
  private getVersion(): string {
    try {
      return packageJson.version || '0.0.0';
    } catch (error) {
      console.debug('Failed to read version from package.json:', error);
      return '0.0.0';
    }
  }

  async show(): Promise<void> {
    await this.showSplashScreen();

    // Check for updates before showing the main menu
    await this.checkForUpdates();

    await this.showMainMenu();
  }

  /**
   * Checks for updates and prompts the user
   */
  private async checkForUpdates(): Promise<void> {
    try {
      const updateInfo = await updateChecker.checkForUpdates();

      if (updateInfo.hasUpdate) {
        const shouldUpdate = await updateChecker.showUpdatePrompt(updateInfo);

        if (shouldUpdate) {
          await updateChecker.performUpdate();

          // Show a message to press Enter to continue
          const messages = languageService.getMessages();
          await input({
            message: '  ' + chalk.gray(messages.welcome.actions.pressEnter)
          });
        }
      }
    } catch (error) {
      // Silently handle update check errors without affecting startup
      console.debug('Update check failed:', error);
    }
  }

  private async showSplashScreen(): Promise<void> {
    // Hide cursor to reduce flickering
    process.stdout.write('\x1B[?25l');
    AnimationUtils.forceClearScreen();

    // Show loading animation
    await this.showLoadingAnimation();

    // Show main title
    this.showGrandTitle();

    // Show subtitle and description
    this.showDescription();

    // Show decorative divider
    this.showDivider();

    // Restore cursor
    process.stdout.write('\x1B[?25h');
  }

  private async showLoadingAnimation(): Promise<void> {
    const messages = languageService.getMessages();

    // Use unified animation utility
    const controller = AnimationUtils.showLoadingAnimation({
      text: messages.welcome.starting,
      interval: 80
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    controller.stop();
  }

  private showGrandTitle(): void {
    // Create a more prominent title
    const title1 = figlet.textSync('OPENAI', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 120,
      whitespaceBreak: true
    });

    const title2 = figlet.textSync('CLI AGENT', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 120,
      whitespaceBreak: true
    });

    // Use multi-layer gradient effect
    console.log(this.gradients.primary(title1));
    console.log(this.gradients.accent(title2));
    console.log();

    // Add version information and badges
    const versionBadge = `  [ v${this.getVersion()} ] `;
    const statusBadge = '  [ BETA ] ';
    const aiBadge = '  [ AI-POWERED ] ';

    console.log(
      '  ' +
      chalk.bgBlue.white.bold(versionBadge) + ' ' +
      chalk.bgGreen.white.bold(statusBadge) + ' ' +
      chalk.bgMagenta.white.bold(aiBadge)
    );
    console.log();
  }

  private showDescription(): void {
    const messages = languageService.getMessages();

    // Main title and subtitle
    console.log('  ' + this.gradients.primary(messages.welcome.tagline));
    console.log('  ' + this.gradients.accent('Github: https://github.com/MayDay-wpf/openai-cli'));
    console.log();
  }

  private showDivider(): void {
    console.log('  ' + chalk.gray('─'.repeat(60)));
    console.log();
  }

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

  private async handleMenuSelection(action: string): Promise<void> {
    const messages = languageService.getMessages();
    console.log();

    switch (action) {
      case 'start':
        try {
          // Check if the configuration is complete
          const configValidation = StorageService.validateApiConfig();

          if (!configValidation.isValid) {
            // Show a warning for incomplete configuration
            const shouldGoToConfig = await this.showConfigWarning(configValidation.missing);

            if (shouldGoToConfig) {
              // User chose to configure, navigate to the config page
              const configPage = new ConfigPage();
              await configPage.show();
              // Ensure terminal state is reset after configuration
              await this.ensureTerminalReset();
              // Redisplay the welcome page
              await this.show();
            } else {
              // User chose to return to the main menu, clear screen and redisplay the whole welcome page
              await this.show();
            }
            return;
          }

          // Configuration is complete, start the main page
          const mainPage = new MainPage();
          await mainPage.show();
          // Ensure the MainPage instance is properly cleaned up
          mainPage.destroy();
          // After the conversation page ends, directly redisplay the welcome page without waiting for a key press
          await this.show();
        } catch (error) {
          console.error('  ' + chalk.red('An error occurred in the conversation page:'), error);
          // Redisplay the welcome page on error as well
          await this.show();
        }
        return;

      case 'config':
        const configPage = new ConfigPage();
        await configPage.show();
        // After the config page is done, ensure the terminal state is fully reset
        await this.ensureTerminalReset();
        // Redisplay the complete welcome page
        await this.show();
        return;

      case 'language':
        await this.handleLanguageSelection();
        return; // Return directly, the interface will be redisplayed after language switch

      case 'help':
        const helpPage = new HelpPage();
        await helpPage.show();
        // After the help page is done, wait for user to press a key to continue
        console.log();
        await input({
          message: '  ' + chalk.gray(messages.welcome.actions.pressEnter)
        });

        // Force clear screen and then redisplay the complete welcome page
        process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
        console.clear();
        process.stdout.write('\x1Bc');
        await this.show();
        break;

      case 'exit':
        await this.showExitAnimation();
        return;

      default:
        console.log('  ' + chalk.red(messages.welcome.actions.unknownAction));
        await this.showMainMenu();
    }
  }

  private async handleLanguageSelection(): Promise<void> {
    const choices = languageService.createLanguageMenuChoices();

    const selectedLanguage = await InteractiveMenu.show({
      message: 'Select Language / 选择语言:',
      choices
    }) as Language;

    const currentLanguage = languageService.getCurrentLanguage();
    if (selectedLanguage !== currentLanguage) {
      languageService.setLanguage(selectedLanguage);

      const messages = languageService.getMessages();
      await AnimationUtils.showActionAnimation(messages.welcome.actions.changingLanguage);

      // Redisplay the entire interface
      await this.show();
    } else {
      await this.showMainMenu();
    }
  }

  private async showExitAnimation(): Promise<void> {
    console.log('\n'.repeat(5));
    const messages = languageService.getMessages();

    // Show farewell message
    const farewell = figlet.textSync('GOODBYE', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 80
    });

    await AnimationUtils.showExitAnimation(farewell, messages.welcome.actions.farewell);

    process.exit(0);
  }

  private async showConfigWarning(missingItems: string[]): Promise<boolean> {
    const messages = languageService.getMessages();
    const configCheck = messages.welcome.configCheck;

    // Show configuration warning
    console.log();
    console.log('  ' + chalk.yellow.bold(configCheck.incompleteConfig));
    console.log();
    console.log('  ' + chalk.gray(configCheck.missingItems));

    // Show missing configuration items
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

    // Show selection menu - only allow going to config or back to main menu
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
   * Ensures the terminal state is fully reset to prevent interference from external tools like editors.
   */
  private async ensureTerminalReset(): Promise<void> {
    // Restore cursor visibility
    process.stdout.write('\x1B[?25h');

    // Ensure stdin is in the correct state
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      // A short delay to ensure the state reset is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      process.stdin.resume();
    }
  }
} 