/**
 * Bottom Status Bar - Adapted from cn-cli-components
 * Displays model info, context usage, repo info, and mode indicator
 */

import chalk from 'chalk';
import { StorageService } from '../../services/storage';

export interface StatusBarOptions {
  model?: string;
  contextPercentage?: number;
  remoteUrl?: string;
  mode?: 'normal' | 'shell' | 'plan';
  showExitHint?: boolean;
  customMessage?: string;
}

/**
 * Bottom Status Bar Manager
 */
export class StatusBar {
  private static currentOptions: StatusBarOptions = {};
  private static isVisible: boolean = false;

  /**
   * Show status bar
   */
  static show(options: StatusBarOptions = {}): void {
    this.currentOptions = { ...options };
    this.isVisible = true;
    this.render();
  }

  /**
   * Update status bar options
   */
  static update(options: Partial<StatusBarOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
    if (this.isVisible) {
      this.render();
    }
  }

  /**
   * Hide status bar
   */
  static hide(): void {
    if (this.isVisible) {
      this.clear();
      this.isVisible = false;
    }
  }

  /**
   * Render the status bar
   */
  private static render(): void {
    const terminalWidth = process.stdout.columns || 80;
    
    // Build left side
    const leftParts: string[] = [];

    // Add custom message or repo info
    if (this.currentOptions.customMessage) {
      leftParts.push(chalk.cyan(this.currentOptions.customMessage));
    } else if (this.currentOptions.showExitHint) {
      leftParts.push(chalk.dim('ctrl+c to exit'));
    } else if (this.currentOptions.remoteUrl) {
      const repoDisplay = this.formatRepoUrl(this.currentOptions.remoteUrl, terminalWidth);
      leftParts.push(chalk.dim(repoDisplay));
    }

    // Add mode indicator
    const modeIndicator = this.getModeIndicator(this.currentOptions.mode);
    if (modeIndicator) {
      leftParts.push(modeIndicator);
    }

    // Add context percentage if high
    if (this.currentOptions.contextPercentage !== undefined && this.currentOptions.contextPercentage > 75) {
      leftParts.push(chalk.dim('•'));
      leftParts.push(this.formatContextPercentage(this.currentOptions.contextPercentage));
    }

    const leftSide = leftParts.join(' ');

    // Build right side
    const rightParts: string[] = [];

    // Add model info
    if (this.currentOptions.model) {
      rightParts.push(chalk.blue(this.currentOptions.model));
    }

    const rightSide = rightParts.join(' ');

    // Calculate spacing
    const leftLength = this.getDisplayLength(leftSide);
    const rightLength = this.getDisplayLength(rightSide);
    const spacing = Math.max(1, terminalWidth - leftLength - rightLength - 4);

    // Build final line
    const statusLine = '  ' + leftSide + ' '.repeat(spacing) + rightSide + '  ';

    // Clear line and write status
    process.stdout.write('\r\x1B[K');
    process.stdout.write(statusLine);
  }

  /**
   * Get mode indicator
   */
  private static getModeIndicator(mode?: string): string {
    if (!mode || mode === 'normal') {
      return chalk.green('● normal');
    }
    if (mode === 'shell') {
      return chalk.yellow('● shell');
    }
    if (mode === 'plan') {
      return chalk.blue('● plan');
    }
    return '';
  }

  /**
   * Format context percentage
   */
  private static formatContextPercentage(percentage: number): string {
    let color = chalk.yellow;
    if (percentage >= 90) {
      color = chalk.red;
    }
    return color(`${Math.round(percentage)}% context`);
  }

  /**
   * Format repository URL for display
   */
  private static formatRepoUrl(url: string, maxWidth: number): string {
    // Extract repo name from URL
    const match = url.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/);
    if (match) {
      const repoName = match[1];
      if (repoName.length <= maxWidth - 20) {
        return repoName;
      }
      return '...' + repoName.slice(-(maxWidth - 23));
    }
    
    // Fallback to truncated URL
    if (url.length <= maxWidth - 20) {
      return url;
    }
    return '...' + url.slice(-(maxWidth - 23));
  }

  /**
   * Get display length (excluding ANSI codes)
   */
  private static getDisplayLength(text: string): number {
    return text.replace(/\x1B\[[0-9;]*m/g, '').length;
  }

  /**
   * Clear the status bar line
   */
  private static clear(): void {
    process.stdout.write('\r\x1B[K');
  }

  /**
   * Check if status bar is visible
   */
  static isShowing(): boolean {
    return this.isVisible;
  }

  /**
   * Get current model from config
   */
  static getCurrentModel(): string | undefined {
    try {
      const config = StorageService.getApiConfig();
      return config.model;
    } catch {
      return undefined;
    }
  }

  /**
   * Get current repo URL from git
   */
  static getCurrentRepoUrl(): string | undefined {
    try {
      const { execSync } = require('child_process');
      const url = execSync('git config --get remote.origin.url', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      return url || undefined;
    } catch {
      return undefined;
    }
  }
}

/**
 * Context Percentage Display Helper
 */
export class ContextPercentageDisplay {
  /**
   * Format context percentage with color
   */
  static format(percentage: number): string {
    let color = chalk.green;
    let icon = '●';

    if (percentage >= 90) {
      color = chalk.red;
      icon = '⚠';
    } else if (percentage >= 75) {
      color = chalk.yellow;
      icon = '●';
    }

    return color(`${icon} ${Math.round(percentage)}% context used`);
  }

  /**
   * Get warning message if context is high
   */
  static getWarning(percentage: number): string | null {
    if (percentage >= 95) {
      return chalk.red.bold('⚠ Context almost full! Consider clearing chat history.');
    }
    if (percentage >= 85) {
      return chalk.yellow('⚠ Context usage is high. Some messages may be dropped.');
    }
    return null;
  }
}

/**
 * Mode Indicator Helper
 */
export class ModeIndicator {
  /**
   * Format mode indicator
   */
  static format(mode: 'normal' | 'shell' | 'plan'): string {
    switch (mode) {
      case 'normal':
        return chalk.green('● normal mode');
      case 'shell':
        return chalk.yellow('● shell mode');
      case 'plan':
        return chalk.blue('● plan mode');
      default:
        return chalk.green('● normal mode');
    }
  }

  /**
   * Get mode description
   */
  static getDescription(mode: 'normal' | 'shell' | 'plan'): string {
    switch (mode) {
      case 'normal':
        return 'Standard chat mode with AI assistance';
      case 'shell':
        return 'Direct shell command execution mode';
      case 'plan':
        return 'Planning mode for complex tasks';
      default:
        return 'Standard chat mode';
    }
  }
}

/**
 * Responsive Repo Display Helper
 */
export class ResponsiveRepoDisplay {
  /**
   * Format repo URL responsively based on terminal width
   */
  static format(remoteUrl: string | undefined, maxWidth?: number): string {
    if (!remoteUrl) {
      return chalk.dim('no repository');
    }

    const width = maxWidth || (process.stdout.columns || 80);
    const availableWidth = Math.floor(width * 0.3); // Use 30% of terminal width

    // Extract repo name from URL
    const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/);
    if (match) {
      const repoName = match[1];
      if (repoName.length <= availableWidth) {
        return chalk.dim(repoName);
      }
      return chalk.dim('...' + repoName.slice(-(availableWidth - 3)));
    }

    // Fallback to truncated URL
    if (remoteUrl.length <= availableWidth) {
      return chalk.dim(remoteUrl);
    }
    return chalk.dim('...' + remoteUrl.slice(-(availableWidth - 3)));
  }
}

