/**
 * Boxed Input Component
 * Creates a bordered input box similar to Ink's Box component
 * Inspired by gemini-cli and cn-cli-components
 */

import chalk from 'chalk';
import { StringUtils } from '../../utils';

export interface BoxedInputOptions {
  prompt?: string;
  placeholder?: string;
  borderColor?: string;
  borderStyle?: 'single' | 'double' | 'round' | 'bold';
  width?: number;
  showCursor?: boolean;
}

const BORDER_STYLES = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  round: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  },
  bold: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
  },
};

export class BoxedInput {
  private options: Required<BoxedInputOptions>;
  private lastRenderedLines: number = 0;

  constructor(options: BoxedInputOptions = {}) {
    this.options = {
      prompt: options.prompt || '> ',
      placeholder: options.placeholder || '',
      borderColor: options.borderColor || 'cyan',
      borderStyle: options.borderStyle || 'round',
      width: options.width || (process.stdout.columns || 80) - 4,
      showCursor: options.showCursor !== false,
    };
  }

  /**
   * Render the boxed input
   */
  public render(input: string, cursorPosition: number): void {
    const terminalWidth = process.stdout.columns || 80;
    const boxWidth = Math.min(this.options.width, terminalWidth - 4);
    const contentWidth = boxWidth - 4; // Account for borders and padding
    
    const borders = BORDER_STYLES[this.options.borderStyle];
    const borderColor = (text: string) => {
      switch (this.options.borderColor) {
        case 'cyan': return chalk.cyan(text);
        case 'blue': return chalk.blue(text);
        case 'green': return chalk.green(text);
        case 'yellow': return chalk.yellow(text);
        case 'magenta': return chalk.magenta(text);
        case 'gray': return chalk.gray(text);
        default: return chalk.cyan(text);
      }
    };

    // Clear previous render
    this.clearPreviousRender();

    // Build the box
    const lines: string[] = [];

    // Top border
    const topBorder = borderColor(
      borders.topLeft + borders.horizontal.repeat(boxWidth - 2) + borders.topRight
    );
    lines.push(topBorder);

    // Content line with prompt and input
    const promptText = chalk.cyan(this.options.prompt);
    const displayText = input || chalk.dim(this.options.placeholder);
    
    // Calculate cursor position for display
    let contentLine = promptText + displayText;
    
    // Add cursor if needed
    if (this.options.showCursor && input.length > 0) {
      const beforeCursor = input.substring(0, cursorPosition);
      const atCursor = input[cursorPosition] || ' ';
      const afterCursor = input.substring(cursorPosition + 1);
      
      contentLine = promptText + 
                   beforeCursor + 
                   chalk.inverse(atCursor) + 
                   afterCursor;
    }

    // Wrap content if needed
    const wrappedLines = this.wrapContent(contentLine, contentWidth);
    
    for (const line of wrappedLines) {
      const paddedLine = this.padLine(line, contentWidth);
      lines.push(borderColor(borders.vertical) + ' ' + paddedLine + ' ' + borderColor(borders.vertical));
    }

    // Bottom border
    const bottomBorder = borderColor(
      borders.bottomLeft + borders.horizontal.repeat(boxWidth - 2) + borders.bottomRight
    );
    lines.push(bottomBorder);

    // Render all lines
    process.stdout.write(lines.join('\n'));
    
    // Store number of lines for next clear
    this.lastRenderedLines = lines.length;

    // Move cursor to input position
    this.moveCursorToInput(cursorPosition, wrappedLines.length);
  }

  /**
   * Render simple input without box (for compatibility)
   */
  public renderSimple(input: string, cursorPosition: number): void {
    // Clear previous
    if (this.lastRenderedLines > 0) {
      for (let i = 0; i < this.lastRenderedLines; i++) {
        process.stdout.write('\x1B[1A\x1B[2K'); // Move up and clear line
      }
    }

    const promptText = chalk.cyan(this.options.prompt);
    const displayText = input || chalk.dim(this.options.placeholder);
    
    let line = promptText + displayText;
    
    // Add cursor
    if (this.options.showCursor && input.length > 0) {
      const beforeCursor = input.substring(0, cursorPosition);
      const atCursor = input[cursorPosition] || ' ';
      const afterCursor = input.substring(cursorPosition + 1);
      
      line = promptText + 
            beforeCursor + 
            chalk.inverse(atCursor) + 
            afterCursor;
    }

    process.stdout.write(line);
    this.lastRenderedLines = 1;
  }

  /**
   * Clear the previous render
   */
  private clearPreviousRender(): void {
    if (this.lastRenderedLines > 0) {
      // Move up to first line
      if (this.lastRenderedLines > 1) {
        process.stdout.write(`\x1B[${this.lastRenderedLines - 1}A`);
      }
      
      // Clear all lines
      for (let i = 0; i < this.lastRenderedLines; i++) {
        process.stdout.write('\x1B[2K'); // Clear line
        if (i < this.lastRenderedLines - 1) {
          process.stdout.write('\x1B[1B'); // Move down
        }
      }
      
      // Move back to first line
      if (this.lastRenderedLines > 1) {
        process.stdout.write(`\x1B[${this.lastRenderedLines - 1}A`);
      }
      process.stdout.write('\r');
    }
  }

  /**
   * Wrap content to fit width
   */
  private wrapContent(content: string, width: number): string[] {
    // Simple wrapping - split by width
    const lines: string[] = [];
    let currentLine = '';
    let currentWidth = 0;

    // Strip ANSI codes for width calculation
    const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*m/g, '');
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const charWidth = StringUtils.getDisplayWidth(stripAnsi(char));
      
      if (currentWidth + charWidth > width) {
        lines.push(currentLine);
        currentLine = char;
        currentWidth = charWidth;
      } else {
        currentLine += char;
        currentWidth += charWidth;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Pad line to width
   */
  private padLine(line: string, width: number): string {
    const stripAnsi = (str: string) => str.replace(/\x1B\[[0-9;]*m/g, '');
    const displayWidth = StringUtils.getDisplayWidth(stripAnsi(line));
    const padding = Math.max(0, width - displayWidth);
    return line + ' '.repeat(padding);
  }

  /**
   * Move cursor to input position
   */
  private moveCursorToInput(cursorPosition: number, contentLines: number): void {
    // Move to the content line (second line of box)
    process.stdout.write('\x1B[1A'); // Move up to last line
    process.stdout.write(`\x1B[${contentLines}A`); // Move up to content line
    
    // Move to cursor position (account for border, padding, and prompt)
    const promptWidth = StringUtils.getDisplayWidth(this.options.prompt);
    const targetCol = 3 + promptWidth + cursorPosition; // 3 = border + space + space
    process.stdout.write(`\x1B[${targetCol}G`);
  }

  /**
   * Clear the input box
   */
  public clear(): void {
    this.clearPreviousRender();
    this.lastRenderedLines = 0;
  }

  /**
   * Update options
   */
  public setOptions(options: Partial<BoxedInputOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }
}

/**
 * Create a new boxed input
 */
export function createBoxedInput(options?: BoxedInputOptions): BoxedInput {
  return new BoxedInput(options);
}

