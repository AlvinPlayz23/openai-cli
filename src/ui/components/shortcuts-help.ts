/**
 * Keyboard Shortcuts Help Component
 * Displays available keyboard shortcuts and commands
 */

import chalk from 'chalk';
import boxen from 'boxen';

export interface ShortcutCategory {
  title: string;
  shortcuts: Array<{ key: string; description: string }>;
}

export class ShortcutsHelp {
  private static readonly categories: ShortcutCategory[] = [
    {
      title: 'Navigation & Control',
      shortcuts: [
        { key: 'Ctrl+C', description: 'Clear current input' },
        { key: 'Ctrl+D', description: 'Exit Catwalk CLI' },
        { key: 'ESC (2x)', description: 'Interrupt AI response' },
        { key: 'Up/Down', description: 'Navigate command history' },
      ]
    },
    {
      title: 'Chat Commands',
      shortcuts: [
        { key: '/help', description: 'Show available commands' },
        { key: '/config', description: 'Open configuration menu' },
        { key: '/clear', description: 'Clear chat history' },
        { key: '/history', description: 'Show conversation history' },
        { key: '/exit', description: 'Exit the application' },
      ]
    },
    {
      title: 'File Operations',
      shortcuts: [
        { key: '@filename', description: 'Attach file to message' },
        { key: '/init', description: 'Initialize project context' },
      ]
    },
    {
      title: 'Advanced',
      shortcuts: [
        { key: '!command', description: 'Execute shell command' },
        { key: '/shortcuts', description: 'Show this help screen' },
      ]
    }
  ];

  /**
   * Display the shortcuts help screen
   */
  public static show(): void {
    console.log('\n');

    // Build help content
    const lines: string[] = [];

    // Title
    lines.push(chalk.cyan.bold('⌨️  Keyboard Shortcuts & Commands'));
    lines.push('');

    // Categories
    for (const category of this.categories) {
      lines.push(chalk.yellow.bold(`${category.title}:`));
      lines.push('');

      for (const shortcut of category.shortcuts) {
        const keyPart = chalk.cyan.bold(this.padRight(shortcut.key, 15));
        const descPart = chalk.white(shortcut.description);
        lines.push(`  ${keyPart} ${descPart}`);
      }

      lines.push('');
    }

    // Tips
    lines.push(chalk.gray('━'.repeat(60)));
    lines.push('');
    lines.push(chalk.dim('💡 Tip: Press ESC twice quickly to interrupt long AI responses'));
    lines.push(chalk.dim('💡 Tip: Use @ to attach files for AI to analyze'));
    lines.push(chalk.dim('💡 Tip: Type /config to change API settings'));

    // Create box
    const helpBox = boxen(lines.join('\n'), {
      padding: { top: 1, bottom: 1, left: 3, right: 3 },
      margin: { top: 0, bottom: 1, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: 'cyan',
      title: chalk.cyan.bold('Help'),
      titleAlignment: 'center'
    });

    console.log(helpBox);
  }

  /**
   * Display a compact shortcuts reminder
   */
  public static showCompact(): void {
    const shortcuts = [
      chalk.dim('Ctrl+C') + chalk.gray(':') + chalk.white('Clear'),
      chalk.dim('Ctrl+D') + chalk.gray(':') + chalk.white('Exit'),
      chalk.dim('ESC') + chalk.gray(':') + chalk.white('Interrupt'),
      chalk.dim('/help') + chalk.gray(':') + chalk.white('Commands')
    ];

    const line = shortcuts.join(chalk.gray(' │ '));
    console.log('\n' + chalk.gray('  ') + line + '\n');
  }

  /**
   * Get shortcuts for a specific context
   */
  public static getContextShortcuts(context: 'chat' | 'config' | 'input'): string[] {
    switch (context) {
      case 'chat':
        return [
          'ESC (2x) - Interrupt AI',
          'Ctrl+C - Clear input',
          '/help - Show commands'
        ];
      case 'config':
        return [
          'Up/Down - Navigate menu',
          'Enter - Select option',
          'ESC - Go back'
        ];
      case 'input':
        return [
          'Ctrl+C - Clear',
          'Up/Down - History',
          'Enter - Send'
        ];
      default:
        return [];
    }
  }

  /**
   * Pad string to the right
   */
  private static padRight(str: string, length: number): string {
    return str + ' '.repeat(Math.max(0, length - str.length));
  }

  /**
   * Show shortcuts for specific category
   */
  public static showCategory(categoryTitle: string): void {
    const category = this.categories.find(c => c.title === categoryTitle);
    if (!category) {
      console.log(chalk.red(`Category "${categoryTitle}" not found`));
      return;
    }

    console.log('\n');
    console.log(chalk.yellow.bold(`${category.title}:`));
    console.log('');

    for (const shortcut of category.shortcuts) {
      const keyPart = chalk.cyan.bold(this.padRight(shortcut.key, 15));
      const descPart = chalk.white(shortcut.description);
      console.log(`  ${keyPart} ${descPart}`);
    }

    console.log('');
  }
}

/**
 * Show shortcuts help
 */
export function showShortcutsHelp(): void {
  ShortcutsHelp.show();
}

/**
 * Show compact shortcuts reminder
 */
export function showCompactShortcuts(): void {
  ShortcutsHelp.showCompact();
}

