/**
 * Tool Permission Components - Adapted from cn-cli-components
 * Handles tool permission requests and user responses
 */

import chalk from 'chalk';
import readline from 'readline';

export interface ToolPermissionRequestOptions {
  toolName: string;
  toolArgs: any;
  requestId: string;
  onResponse: (requestId: string, approved: boolean) => void;
}

export interface ToolPermissionSelectorOptions {
  toolName: string;
  toolArgs: any;
  requestId: string;
  toolCallPreview?: string[];
  hasDynamicEvaluation?: boolean;
  onResponse: (
    requestId: string,
    approved: boolean,
    createPolicy?: boolean,
    stopStream?: boolean
  ) => void;
}

interface PermissionOption {
  id: string;
  name: string;
  color: string;
  approved: boolean;
  createPolicy?: boolean;
  stopStream?: boolean;
  shortcut?: string;
}

/**
 * Simple Tool Permission Request (Y/N prompt)
 */
export class ToolPermissionRequest {
  private responded: boolean = false;
  private rl: readline.Interface | null = null;

  /**
   * Show permission request and wait for response
   */
  async show(options: ToolPermissionRequestOptions): Promise<void> {
    console.log();
    console.log(chalk.yellow('⚠ ') + chalk.yellow.bold('Permission Required'));
    console.log('  Tool: ' + chalk.cyan(options.toolName));

    const formattedArgs = this.formatArgs(options.toolArgs);
    if (formattedArgs) {
      console.log('  Args: ' + chalk.gray(formattedArgs));
    }

    console.log('  Allow this tool call? (' + chalk.green.bold('y') + '/' + chalk.red.bold('n') + ')');

    // Wait for user input
    await this.waitForInput(options);
  }

  /**
   * Format tool arguments for display
   */
  private formatArgs(args: any): string {
    if (!args || Object.keys(args).length === 0) return '';

    const firstKey = Object.keys(args)[0];
    const firstValue = args[firstKey];

    if (typeof firstValue === 'string' && firstValue.length > 50) {
      return `${firstValue.substring(0, 50)}...`;
    }

    return String(firstValue);
  }

  /**
   * Wait for user input (y/n)
   */
  private async waitForInput(options: ToolPermissionRequestOptions): Promise<void> {
    return new Promise((resolve) => {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const handleInput = (key: string) => {
        if (this.responded) return;

        const input = key.toLowerCase();
        if (input === 'y') {
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, true);
          resolve();
        } else if (input === 'n') {
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, false);
          resolve();
        }
      };

      process.stdin.on('data', handleInput);

      // Cleanup on exit
      this.rl.on('close', () => {
        process.stdin.removeListener('data', handleInput);
        resolve();
      });
    });
  }

  /**
   * Cleanup readline interface
   */
  private cleanup(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Advanced Tool Permission Selector (with options)
 */
export class ToolPermissionSelector {
  private selectedIndex: number = 0;
  private responded: boolean = false;
  private rl: readline.Interface | null = null;

  /**
   * Show permission selector and wait for response
   */
  async show(options: ToolPermissionSelectorOptions): Promise<void> {
    const permissionOptions = this.getPermissionOptions();

    // Display header
    console.log();
    console.log('┌' + '─'.repeat(78) + '┐');
    console.log('│ ' + chalk.magenta.bold(this.formatToolTitle(options.toolName, options.toolArgs)) + ' '.repeat(Math.max(0, 77 - this.formatToolTitle(options.toolName, options.toolArgs).length)) + '│');
    console.log('├' + '─'.repeat(78) + '┤');

    // Display preview if available
    if (options.toolCallPreview && options.toolCallPreview.length > 0) {
      options.toolCallPreview.forEach(line => {
        const displayLine = line.length > 76 ? line.substring(0, 73) + '...' : line;
        console.log('│ ' + displayLine + ' '.repeat(Math.max(0, 77 - displayLine.length)) + '│');
      });
      console.log('├' + '─'.repeat(78) + '┤');
    }

    // Display prompt
    console.log('│ ' + chalk.dim('Would you like to continue?') + ' '.repeat(50) + '│');

    // Display warning if needed
    if (options.hasDynamicEvaluation) {
      console.log('│ ' + chalk.yellow('Note: Dangerous commands will be blocked regardless.') + ' '.repeat(25) + '│');
    }

    console.log('└' + '─'.repeat(78) + '┘');
    console.log();

    // Display options
    this.renderOptions(permissionOptions);

    // Wait for user input
    await this.waitForInput(options, permissionOptions);
  }

  /**
   * Get permission options
   */
  private getPermissionOptions(): PermissionOption[] {
    return [
      {
        id: 'approve',
        name: 'Continue',
        color: 'green',
        approved: true,
        shortcut: '(tab)'
      },
      {
        id: 'approve_policy',
        name: "Continue + don't ask again",
        color: 'cyan',
        approved: true,
        createPolicy: true,
        shortcut: '(shift+tab)'
      },
      {
        id: 'deny_stop',
        name: 'No, and tell AI what to do differently',
        color: 'yellow',
        approved: false,
        stopStream: true,
        shortcut: '(esc)'
      }
    ];
  }

  /**
   * Render permission options
   */
  private renderOptions(options: PermissionOption[]): void {
    options.forEach((option, index) => {
      const isSelected = index === this.selectedIndex;
      const prefix = isSelected ? '> ' : '  ';
      const colorFn = isSelected ? this.getColorFunction(option.color, true) : chalk.white;
      const shortcut = option.shortcut ? ' ' + chalk.gray(option.shortcut) : '';

      console.log(prefix + colorFn(option.name) + shortcut);
    });
  }

  /**
   * Format tool title
   */
  private formatToolTitle(toolName: string, toolArgs: any): string {
    return `Tool: ${toolName}`;
  }

  /**
   * Get chalk color function
   */
  private getColorFunction(color: string, bold: boolean = false): (text: string) => string {
    let fn: any = chalk;
    switch (color) {
      case 'green':
        fn = chalk.green;
        break;
      case 'cyan':
        fn = chalk.cyan;
        break;
      case 'yellow':
        fn = chalk.yellow;
        break;
      case 'red':
        fn = chalk.red;
        break;
      default:
        fn = chalk.white;
    }
    return bold ? fn.bold : fn;
  }

  /**
   * Wait for user input
   */
  private async waitForInput(
    options: ToolPermissionSelectorOptions,
    permissionOptions: PermissionOption[]
  ): Promise<void> {
    return new Promise((resolve) => {
      // Enable raw mode for key detection
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      const handleKey = (buffer: Buffer) => {
        if (this.responded) return;

        const key = buffer.toString();

        // Handle arrow keys
        if (key === '\u001B[A') {
          // Up arrow
          this.selectedIndex = Math.max(0, this.selectedIndex - 1);
          this.clearOptions(permissionOptions.length);
          this.renderOptions(permissionOptions);
        } else if (key === '\u001B[B') {
          // Down arrow
          this.selectedIndex = Math.min(permissionOptions.length - 1, this.selectedIndex + 1);
          this.clearOptions(permissionOptions.length);
          this.renderOptions(permissionOptions);
        } else if (key === '\r' || key === '\n') {
          // Enter
          const selected = permissionOptions[this.selectedIndex];
          this.responded = true;
          this.cleanup();
          options.onResponse(
            options.requestId,
            selected.approved,
            selected.createPolicy,
            selected.stopStream
          );
          resolve();
        } else if (key === '\t') {
          // Tab - approve
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, true, false, false);
          resolve();
        } else if (key === '\u001B') {
          // Escape - deny and stop
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, false, false, true);
          resolve();
        } else if (key.toLowerCase() === 'y') {
          // Y - approve
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, true, false, false);
          resolve();
        } else if (key.toLowerCase() === 'n') {
          // N - deny and stop
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, false, false, true);
          resolve();
        } else if (key === '\u0003') {
          // Ctrl+C
          this.responded = true;
          this.cleanup();
          options.onResponse(options.requestId, false, false, true);
          resolve();
        }
      };

      process.stdin.on('data', handleKey);
    });
  }

  /**
   * Clear option lines
   */
  private clearOptions(count: number): void {
    for (let i = 0; i < count; i++) {
      process.stdout.write('\x1B[1A\x1B[2K');
    }
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }
}

