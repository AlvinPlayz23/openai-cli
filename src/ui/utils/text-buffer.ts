/**
 * TextBuffer - Text manipulation utility adapted from cn-cli-components
 * Handles text input, cursor management, and text operations
 */

export class TextBuffer {
  private _text: string = '';
  private _cursor: number = 0;
  private stateChangeCallback: (() => void) | null = null;
  private pendingTimer: NodeJS.Timeout | null = null;

  constructor(initialText: string = '') {
    this._text = initialText;
    this._cursor = initialText.length;
  }

  /**
   * Get current text
   */
  get text(): string {
    return this._text;
  }

  /**
   * Set text and move cursor to end
   */
  set text(value: string) {
    this._text = value;
    this._cursor = value.length;
    this.notifyChange();
  }

  /**
   * Get current cursor position
   */
  get cursor(): number {
    return this._cursor;
  }

  /**
   * Set cursor position (clamped to valid range)
   */
  set cursor(position: number) {
    this._cursor = Math.max(0, Math.min(position, this._text.length));
    this.notifyChange();
  }

  /**
   * Get text length
   */
  get length(): number {
    return this._text.length;
  }

  /**
   * Check if buffer is empty
   */
  get isEmpty(): boolean {
    return this._text.length === 0;
  }

  /**
   * Set callback for state changes
   */
  setStateChangeCallback(callback: (() => void) | null): void {
    this.stateChangeCallback = callback;
  }

  /**
   * Notify state change (debounced)
   */
  private notifyChange(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
    }
    
    // Immediate notification for now (can be debounced if needed)
    if (this.stateChangeCallback) {
      this.stateChangeCallback();
    }
  }

  /**
   * Insert text at cursor position
   */
  insert(text: string): void {
    this._text = 
      this._text.slice(0, this._cursor) + 
      text + 
      this._text.slice(this._cursor);
    this._cursor += text.length;
    this.notifyChange();
  }

  /**
   * Delete character before cursor (backspace)
   */
  deleteBackward(): boolean {
    if (this._cursor === 0) return false;
    
    this._text = 
      this._text.slice(0, this._cursor - 1) + 
      this._text.slice(this._cursor);
    this._cursor--;
    this.notifyChange();
    return true;
  }

  /**
   * Delete character at cursor (delete key)
   */
  deleteForward(): boolean {
    if (this._cursor >= this._text.length) return false;
    
    this._text = 
      this._text.slice(0, this._cursor) + 
      this._text.slice(this._cursor + 1);
    this.notifyChange();
    return true;
  }

  /**
   * Delete word before cursor (Ctrl+W)
   */
  deleteWordBackward(): boolean {
    if (this._cursor === 0) return false;
    
    const textBefore = this._text.slice(0, this._cursor);
    const match = textBefore.match(/\S+\s*$/);
    
    if (match) {
      const deleteCount = match[0].length;
      this._text = 
        this._text.slice(0, this._cursor - deleteCount) + 
        this._text.slice(this._cursor);
      this._cursor -= deleteCount;
    } else {
      // Delete all whitespace before cursor
      const whitespaceMatch = textBefore.match(/\s+$/);
      if (whitespaceMatch) {
        const deleteCount = whitespaceMatch[0].length;
        this._text = 
          this._text.slice(0, this._cursor - deleteCount) + 
          this._text.slice(this._cursor);
        this._cursor -= deleteCount;
      }
    }
    
    this.notifyChange();
    return true;
  }

  /**
   * Delete from cursor to end of line (Ctrl+K)
   */
  deleteToEnd(): boolean {
    if (this._cursor >= this._text.length) return false;
    
    this._text = this._text.slice(0, this._cursor);
    this.notifyChange();
    return true;
  }

  /**
   * Delete from start to cursor (Ctrl+U)
   */
  deleteToStart(): boolean {
    if (this._cursor === 0) return false;
    
    this._text = this._text.slice(this._cursor);
    this._cursor = 0;
    this.notifyChange();
    return true;
  }

  /**
   * Move cursor left
   */
  moveCursorLeft(count: number = 1): boolean {
    if (this._cursor === 0) return false;
    
    this._cursor = Math.max(0, this._cursor - count);
    this.notifyChange();
    return true;
  }

  /**
   * Move cursor right
   */
  moveCursorRight(count: number = 1): boolean {
    if (this._cursor >= this._text.length) return false;
    
    this._cursor = Math.min(this._text.length, this._cursor + count);
    this.notifyChange();
    return true;
  }

  /**
   * Move cursor to start of line (Home / Ctrl+A)
   */
  moveCursorToStart(): void {
    this._cursor = 0;
    this.notifyChange();
  }

  /**
   * Move cursor to end of line (End / Ctrl+E)
   */
  moveCursorToEnd(): void {
    this._cursor = this._text.length;
    this.notifyChange();
  }

  /**
   * Move cursor to previous word (Ctrl+Left)
   */
  moveCursorToPreviousWord(): boolean {
    if (this._cursor === 0) return false;
    
    const textBefore = this._text.slice(0, this._cursor);
    // Skip current whitespace
    const trimmed = textBefore.trimEnd();
    if (trimmed.length < textBefore.length) {
      this._cursor = trimmed.length;
    }
    
    // Find previous word boundary
    const match = trimmed.match(/\S+\s*$/);
    if (match) {
      this._cursor = trimmed.length - match[0].length;
    } else {
      this._cursor = 0;
    }
    
    this.notifyChange();
    return true;
  }

  /**
   * Move cursor to next word (Ctrl+Right)
   */
  moveCursorToNextWord(): boolean {
    if (this._cursor >= this._text.length) return false;
    
    const textAfter = this._text.slice(this._cursor);
    // Skip current word
    const match = textAfter.match(/^\S+/);
    if (match) {
      this._cursor += match[0].length;
    }
    
    // Skip whitespace
    const whitespaceMatch = this._text.slice(this._cursor).match(/^\s+/);
    if (whitespaceMatch) {
      this._cursor += whitespaceMatch[0].length;
    }
    
    this.notifyChange();
    return true;
  }

  /**
   * Clear all text
   */
  clear(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this._text = '';
    this._cursor = 0;
    this.notifyChange();
  }

  /**
   * Get text before cursor
   */
  getTextBeforeCursor(): string {
    return this._text.slice(0, this._cursor);
  }

  /**
   * Get text after cursor
   */
  getTextAfterCursor(): string {
    return this._text.slice(this._cursor);
  }

  /**
   * Replace entire text and reset cursor
   */
  replace(newText: string): void {
    this._text = newText;
    this._cursor = newText.length;
    this.notifyChange();
  }

  /**
   * Get a copy of the current state
   */
  getState(): { text: string; cursor: number } {
    return {
      text: this._text,
      cursor: this._cursor
    };
  }

  /**
   * Restore state from a previous snapshot
   */
  setState(state: { text: string; cursor: number }): void {
    this._text = state.text;
    this._cursor = Math.max(0, Math.min(state.cursor, state.text.length));
    this.notifyChange();
  }
}

