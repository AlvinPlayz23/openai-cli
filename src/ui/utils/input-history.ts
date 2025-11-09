/**
 * InputHistory - Command history management adapted from cn-cli-components
 * Handles up/down arrow navigation through previous commands
 */

import { StorageService } from '../../services/storage';

export class InputHistory {
  private history: string[] = [];
  private currentIndex: number = -1;
  private temporaryInput: string = '';
  private maxHistorySize: number = 100;
  private storageKey: string = 'command_history';

  constructor(maxSize: number = 100) {
    this.maxHistorySize = maxSize;
    this.loadFromStorage();
  }

  /**
   * Load history from storage
   */
  private loadFromStorage(): void {
    try {
      const config = StorageService.getConfig();
      const stored = config[this.storageKey];
      if (stored && Array.isArray(stored)) {
        this.history = stored.slice(-this.maxHistorySize);
      }
    } catch (error) {
      // Ignore errors, start with empty history
      this.history = [];
    }
  }

  /**
   * Save history to storage
   */
  private saveToStorage(): void {
    try {
      StorageService.setConfig(this.storageKey, this.history);
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Add a new command to history
   * @param input - The command to add
   * @param force - Force add even if it's a duplicate of the last command
   */
  add(input: string, force: boolean = false): void {
    // Don't add empty commands
    if (!input.trim()) {
      return;
    }

    // Don't add if it's the same as the last command (unless forced)
    if (!force && this.history.length > 0 && this.history[this.history.length - 1] === input) {
      return;
    }

    // Add to history
    this.history.push(input);

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    // Reset navigation
    this.reset();

    // Save to storage
    this.saveToStorage();
  }

  /**
   * Get previous command in history (up arrow)
   * @param currentInput - Current input text (saved as temporary)
   * @returns Previous command or null if at the beginning
   */
  previous(currentInput: string = ''): string | null {
    if (this.history.length === 0) {
      return null;
    }

    // If we're at the end (not navigating), save current input
    if (this.currentIndex === -1) {
      this.temporaryInput = currentInput;
      this.currentIndex = this.history.length - 1;
      return this.history[this.currentIndex];
    }

    // Move to previous command
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }

    // Already at the beginning
    return this.history[this.currentIndex];
  }

  /**
   * Get next command in history (down arrow)
   * @returns Next command, temporary input, or null
   */
  next(): string | null {
    if (this.currentIndex === -1) {
      // Not navigating, return null
      return null;
    }

    // Move to next command
    this.currentIndex++;

    // If we've reached the end, return temporary input and reset
    if (this.currentIndex >= this.history.length) {
      const temp = this.temporaryInput;
      this.reset();
      return temp;
    }

    return this.history[this.currentIndex];
  }

  /**
   * Reset navigation state
   */
  reset(): void {
    this.currentIndex = -1;
    this.temporaryInput = '';
  }

  /**
   * Get all history entries
   */
  getAll(): string[] {
    return [...this.history];
  }

  /**
   * Get history size
   */
  get size(): number {
    return this.history.length;
  }

  /**
   * Check if currently navigating history
   */
  get isNavigating(): boolean {
    return this.currentIndex !== -1;
  }

  /**
   * Get current navigation index
   */
  get index(): number {
    return this.currentIndex;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.reset();
    this.saveToStorage();
  }

  /**
   * Search history for commands matching a pattern
   * @param pattern - Search pattern (case-insensitive)
   * @returns Matching commands in reverse chronological order
   */
  search(pattern: string): string[] {
    if (!pattern.trim()) {
      return [];
    }

    const lowerPattern = pattern.toLowerCase();
    return this.history
      .filter(cmd => cmd.toLowerCase().includes(lowerPattern))
      .reverse();
  }

  /**
   * Get the last N commands
   * @param count - Number of commands to retrieve
   * @returns Last N commands in reverse chronological order
   */
  getRecent(count: number = 10): string[] {
    return this.history.slice(-count).reverse();
  }

  /**
   * Remove a specific command from history
   * @param index - Index of command to remove
   */
  remove(index: number): boolean {
    if (index < 0 || index >= this.history.length) {
      return false;
    }

    this.history.splice(index, 1);
    this.reset();
    this.saveToStorage();
    return true;
  }

  /**
   * Get unique commands (removes duplicates, keeps last occurrence)
   */
  getUnique(): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    // Iterate in reverse to keep last occurrence
    for (let i = this.history.length - 1; i >= 0; i--) {
      const cmd = this.history[i];
      if (!seen.has(cmd)) {
        seen.add(cmd);
        unique.unshift(cmd);
      }
    }

    return unique;
  }

  /**
   * Export history as JSON string
   */
  export(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import history from JSON string
   * @param json - JSON string containing history array
   * @returns Success status
   */
  import(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.history = imported
          .filter(item => typeof item === 'string')
          .slice(-this.maxHistorySize);
        this.reset();
        this.saveToStorage();
        return true;
      }
    } catch (error) {
      // Invalid JSON
    }
    return false;
  }
}

