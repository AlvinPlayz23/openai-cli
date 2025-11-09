/**
 * Action Status - Tool calling indicator adapted from cn-cli-components
 * Shows current action with spinner, message, and timer
 */

import chalk from 'chalk';
import { AnimationUtils } from '../../utils/animation';

export interface ActionStatusOptions {
  message: string;
  showSpinner?: boolean;
  color?: string;
  loadingColor?: string;
}

export interface ActionStatusController {
  update(message: string): void;
  stop(): void;
}

/**
 * Action Status Manager - Displays tool calling status with timer
 */
export class ActionStatus {
  private static currentController: ActionStatusController | null = null;
  private static startTime: number = 0;
  private static timerInterval: NodeJS.Timeout | null = null;
  private static spinnerController: any = null;
  private static currentMessage: string = '';
  private static currentColor: string = 'dim';
  private static showSpinner: boolean = false;

  /**
   * Show action status with spinner and timer
   */
  static show(options: ActionStatusOptions): ActionStatusController {
    // Stop any existing status
    this.stop();

    this.startTime = Date.now();
    this.currentMessage = options.message;
    this.currentColor = options.color || 'dim';
    this.showSpinner = options.showSpinner !== false;

    // Start spinner if requested
    if (this.showSpinner) {
      this.spinnerController = AnimationUtils.showLoadingAnimation({
        text: '',
        interval: 150
      });
    }

    // Start timer
    this.startTimer();

    // Create controller
    const controller: ActionStatusController = {
      update: (message: string) => {
        this.currentMessage = message;
        this.render();
      },
      stop: () => {
        this.stop();
      }
    };

    this.currentController = controller;
    this.render();

    return controller;
  }

  /**
   * Start the timer that updates every second
   */
  private static startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.render();
    }, 1000);
  }

  /**
   * Render the action status line
   */
  private static render(): void {
    if (!this.currentController) return;

    // Calculate elapsed time
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const elapsedText = `${elapsed}s`;

    // Build status line
    const parts: string[] = [];

    // Add spinner space (if showing)
    if (this.showSpinner) {
      parts.push('   '); // Space for spinner
    }

    // Add message
    const colorFn = this.getColorFunction(this.currentColor);
    parts.push(colorFn(this.currentMessage));

    // Add timer and interrupt hint
    parts.push(chalk.dim('('));
    parts.push(chalk.dim(elapsedText));
    parts.push(chalk.dim(' • esc to interrupt )'));

    // Clear line and write status
    process.stdout.write('\r\x1B[K');
    process.stdout.write('  ' + parts.join(' '));
  }

  /**
   * Get chalk color function by name
   */
  private static getColorFunction(color: string): (text: string) => string {
    switch (color) {
      case 'dim':
        return chalk.dim;
      case 'green':
        return chalk.green;
      case 'yellow':
        return chalk.yellow;
      case 'red':
        return chalk.red;
      case 'blue':
        return chalk.blue;
      case 'cyan':
        return chalk.cyan;
      case 'magenta':
        return chalk.magenta;
      default:
        return chalk.white;
    }
  }

  /**
   * Stop the action status
   */
  static stop(): void {
    // Stop timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Stop spinner
    if (this.spinnerController) {
      this.spinnerController.stop();
      this.spinnerController = null;
    }

    // Clear line
    if (this.currentController) {
      process.stdout.write('\r\x1B[K');
    }

    this.currentController = null;
    this.currentMessage = '';
  }

  /**
   * Check if action status is currently showing
   */
  static isShowing(): boolean {
    return this.currentController !== null;
  }

  /**
   * Get elapsed time in seconds
   */
  static getElapsedTime(): number {
    if (!this.currentController) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

/**
 * Simple timer utility for displaying elapsed time
 */
export class Timer {
  private startTime: number;
  private interval: NodeJS.Timeout | null = null;
  private callback: (elapsed: number) => void;

  constructor(callback: (elapsed: number) => void) {
    this.startTime = Date.now();
    this.callback = callback;
  }

  /**
   * Start the timer
   */
  start(): void {
    this.interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.callback(elapsed);
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsed(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Reset the timer
   */
  reset(): void {
    this.startTime = Date.now();
  }

  /**
   * Format elapsed time as string
   */
  static formatElapsed(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

