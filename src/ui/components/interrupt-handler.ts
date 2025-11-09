/**
 * Interrupt Handler Component
 * Handles ESC key press to interrupt AI streaming responses
 * Inspired by gemini-cli's interrupt handling
 */

import chalk from 'chalk';

export interface InterruptHandlerOptions {
  onInterrupt: () => void;
  onEscapePrompt?: (show: boolean) => void;
}

export class InterruptHandler {
  private isActive: boolean = false;
  private escPressCount: number = 0;
  private escTimer: NodeJS.Timeout | null = null;
  private showEscPrompt: boolean = false;
  private keyListener: ((data: Buffer) => void) | null = null;
  private options: InterruptHandlerOptions;

  constructor(options: InterruptHandlerOptions) {
    this.options = options;
  }

  /**
   * Start listening for ESC key during AI streaming
   */
  public start(): void {
    if (this.isActive) {
      return; // Already active
    }

    this.isActive = true;
    this.escPressCount = 0;
    this.showEscPrompt = false;

    // Enable raw mode to capture individual key presses
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      } catch (error) {
        // If raw mode fails, try to resume anyway
        try {
          process.stdin.resume();
        } catch (e) {
          // Ignore
        }
      }
    } else {
      process.stdin.resume();
    }

    process.stdin.setEncoding('utf8');

    // Create key listener
    this.keyListener = (data: Buffer) => {
      const key = data.toString();
      const keyCode = key.charCodeAt(0);

      // ESC key (keyCode 27)
      if (keyCode === 27 && key.length === 1) {
        this.handleEscPress();
      }
    };

    // Add listener
    process.stdin.on('data', this.keyListener);
  }

  /**
   * Stop listening for ESC key
   */
  public stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Clear timer
    if (this.escTimer) {
      clearTimeout(this.escTimer);
      this.escTimer = null;
    }

    // Remove listener first
    if (this.keyListener) {
      process.stdin.removeListener('data', this.keyListener);
      this.keyListener = null;
    }

    // Clear escape prompt if showing
    if (this.showEscPrompt) {
      this.clearEscPrompt();
      this.showEscPrompt = false;
    }

    this.escPressCount = 0;

    // Leave stdin in paused state with raw mode off
    // This allows getUserInput to take over cleanly
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
      } catch (error) {
        // Ignore errors
      }
    }

    try {
      process.stdin.pause();
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Handle ESC key press
   */
  private handleEscPress(): void {
    if (this.escPressCount === 0) {
      // First ESC press
      this.escPressCount = 1;
      this.showEscPrompt = true;
      
      // Show prompt
      this.displayEscPrompt();
      
      // Notify parent
      if (this.options.onEscapePrompt) {
        this.options.onEscapePrompt(true);
      }

      // Set timeout to reset
      if (this.escTimer) {
        clearTimeout(this.escTimer);
      }
      
      this.escTimer = setTimeout(() => {
        this.resetEscapeState();
      }, 500);
    } else {
      // Second ESC press - interrupt!
      this.clearEscPrompt();
      this.resetEscapeState();
      
      // Call interrupt callback
      this.options.onInterrupt();
      
      // Stop listening
      this.stop();
    }
  }

  /**
   * Reset escape state
   */
  private resetEscapeState(): void {
    if (this.escTimer) {
      clearTimeout(this.escTimer);
      this.escTimer = null;
    }
    
    if (this.showEscPrompt) {
      this.clearEscPrompt();
    }
    
    this.escPressCount = 0;
    this.showEscPrompt = false;
    
    // Notify parent
    if (this.options.onEscapePrompt) {
      this.options.onEscapePrompt(false);
    }
  }

  /**
   * Display ESC prompt message
   */
  private displayEscPrompt(): void {
    // Save cursor position
    process.stdout.write('\x1B[s');
    
    // Move to bottom of screen
    process.stdout.write('\x1B[999;1H');
    
    // Clear line and show prompt
    process.stdout.write('\x1B[2K');
    process.stdout.write(chalk.yellow('⚠ Press ESC again to interrupt • esc to cancel'));
    
    // Restore cursor position
    process.stdout.write('\x1B[u');
  }

  /**
   * Clear ESC prompt message
   */
  private clearEscPrompt(): void {
    // Save cursor position
    process.stdout.write('\x1B[s');
    
    // Move to bottom of screen
    process.stdout.write('\x1B[999;1H');
    
    // Clear line
    process.stdout.write('\x1B[2K');
    
    // Restore cursor position
    process.stdout.write('\x1B[u');
  }

  /**
   * Check if handler is active
   */
  public isListening(): boolean {
    return this.isActive;
  }

  /**
   * Check if ESC prompt is showing
   */
  public isShowingPrompt(): boolean {
    return this.showEscPrompt;
  }
}

/**
 * Create a new interrupt handler
 */
export function createInterruptHandler(options: InterruptHandlerOptions): InterruptHandler {
  return new InterruptHandler(options);
}

