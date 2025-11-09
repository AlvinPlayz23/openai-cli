/**
 * Markdown Renderer - Parse and render markdown with syntax highlighting
 * Adapted from cn-cli-components for class-based architecture
 */

import chalk from 'chalk';
import { detectLanguage, highlightCode, defaultTheme, SyntaxTheme } from '../utils/syntax-highlighter';

export interface MarkdownRenderOptions {
  theme?: SyntaxTheme;
  maxWidth?: number;
  indent?: string;
}

/**
 * Markdown pattern for matching and rendering
 */
interface MarkdownPattern {
  regex: RegExp;
  render: (match: RegExpMatchArray, options: MarkdownRenderOptions) => string;
}

/**
 * Render markdown content with syntax highlighting
 */
export class MarkdownRenderer {
  private theme: SyntaxTheme;
  private maxWidth: number;
  private indent: string;

  constructor(options: MarkdownRenderOptions = {}) {
    this.theme = options.theme || defaultTheme;
    this.maxWidth = options.maxWidth || (process.stdout.columns || 80);
    this.indent = options.indent || '';
  }

  /**
   * Render markdown text to colored terminal output
   */
  render(content: string | null | undefined): string {
    if (!content) {
      return '';
    }

    const lines: string[] = [];
    let currentIndex = 0;

    // First, handle code blocks separately (they have highest priority)
    const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
    let match: RegExpMatchArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index !== undefined && match.index > currentIndex) {
        const textBefore = content.slice(currentIndex, match.index);
        lines.push(...this.renderInlineMarkdown(textBefore));
      }

      // Render code block
      const language = match[1] || 'plaintext';
      const code = match[2] || '';
      lines.push(...this.renderCodeBlock(code, language));

      if (match.index !== undefined) {
        currentIndex = match.index + match[0].length;
      }
    }

    // Add remaining text after last code block
    if (currentIndex < content.length) {
      const textAfter = content.slice(currentIndex);
      lines.push(...this.renderInlineMarkdown(textAfter));
    }

    return lines.join('\n');
  }

  /**
   * Render a code block with syntax highlighting
   */
  private renderCodeBlock(code: string, language: string): string[] {
    const lines: string[] = [];
    
    // Add top border
    lines.push(chalk.dim('┌' + '─'.repeat(Math.min(this.maxWidth - 2, 78)) + '┐'));
    
    // Add language label if specified
    if (language && language !== 'plaintext') {
      lines.push(chalk.dim('│ ') + chalk.cyan.bold(language) + chalk.dim(' '.repeat(Math.max(0, this.maxWidth - language.length - 4)) + '│'));
      lines.push(chalk.dim('├' + '─'.repeat(Math.min(this.maxWidth - 2, 78)) + '┤'));
    }

    // Highlight and add code lines
    const highlighted = highlightCode(code.trim(), language, this.theme);
    const codeLines = highlighted.split('\n');
    
    for (const line of codeLines) {
      // Truncate if too long
      const displayLine = line.length > this.maxWidth - 4 
        ? line.slice(0, this.maxWidth - 7) + '...'
        : line;
      lines.push(chalk.dim('│ ') + displayLine + chalk.dim(' '.repeat(Math.max(0, this.maxWidth - this.getDisplayWidth(displayLine) - 4)) + '│'));
    }

    // Add bottom border
    lines.push(chalk.dim('└' + '─'.repeat(Math.min(this.maxWidth - 2, 78)) + '┘'));

    return lines;
  }

  /**
   * Render inline markdown (bold, italic, code, etc.)
   */
  private renderInlineMarkdown(text: string): string[] {
    const lines = text.split('\n');
    return lines.map(line => this.processInlinePatterns(line));
  }

  /**
   * Process inline markdown patterns
   */
  private processInlinePatterns(line: string): string {
    let result = line;

    // Thinking tags (special case)
    result = result.replace(/<think>([\s\S]*?)<\/think>/g, (_, content) => {
      return chalk.dim(content.trim());
    });

    // Headers (must be at start of line)
    if (result.match(/^(#{1,6})\s+(.+)$/)) {
      result = result.replace(/^(#{1,6})\s+(.+)$/, (_, hashes, content) => {
        const level = hashes.length;
        if (level === 1) return chalk.bold.cyan(content);
        if (level === 2) return chalk.bold.blue(content);
        return chalk.bold(content);
      });
      return result;
    }

    // Bold (**text**)
    result = result.replace(/\*\*(.+?)\*\*/g, (_, content) => {
      return chalk.bold(content);
    });

    // Italic (*text* or _text_)
    result = result.replace(/\*([^\s*][^*]*[^\s*]|[^\s*])\*/g, (_, content) => {
      return chalk.italic(content);
    });
    result = result.replace(/_([^_]+)_/g, (_, content) => {
      return chalk.italic(content);
    });

    // Strikethrough (~~text~~)
    result = result.replace(/~~([^~]+)~~/g, (_, content) => {
      return chalk.strikethrough(content);
    });

    // Inline code (`code`)
    result = result.replace(/`([^`\n]+)`/g, (_, content) => {
      return chalk.magentaBright(content);
    });

    // Links ([text](url))
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      return chalk.blue.underline(text) + chalk.dim(` (${url})`);
    });

    // Bullet points
    if (result.match(/^\s*[-*+]\s+/)) {
      result = result.replace(/^(\s*)([-*+])(\s+)/, (_, indent, bullet, space) => {
        return indent + chalk.cyan('•') + space;
      });
    }

    // Numbered lists
    if (result.match(/^\s*\d+\.\s+/)) {
      result = result.replace(/^(\s*)(\d+)(\.)(\s+)/, (_, indent, num, dot, space) => {
        return indent + chalk.cyan(num + dot) + space;
      });
    }

    // Blockquotes
    if (result.match(/^\s*>\s+/)) {
      result = result.replace(/^(\s*)(>)(\s+)/, (_, indent, quote, space) => {
        return indent + chalk.dim('│') + space;
      });
      result = chalk.dim(result);
    }

    return result;
  }

  /**
   * Get display width of text (excluding ANSI codes)
   */
  private getDisplayWidth(text: string): number {
    // Remove ANSI escape codes
    const stripped = text.replace(/\x1B\[[0-9;]*m/g, '');
    return stripped.length;
  }

  /**
   * Render a simple message without markdown processing
   */
  static renderPlain(text: string): string {
    return text;
  }

  /**
   * Render markdown with default options
   */
  static render(content: string, options?: MarkdownRenderOptions): string {
    const renderer = new MarkdownRenderer(options);
    return renderer.render(content);
  }

  /**
   * Render only code blocks from markdown
   */
  static renderCodeBlocks(content: string, options?: MarkdownRenderOptions): string[] {
    const renderer = new MarkdownRenderer(options);
    const blocks: string[] = [];
    
    const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
    let match: RegExpMatchArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'plaintext';
      const code = match[2] || '';
      blocks.push(renderer.renderCodeBlock(code, language).join('\n'));
    }

    return blocks;
  }

  /**
   * Strip all markdown formatting
   */
  static stripMarkdown(content: string): string {
    let result = content;

    // Remove code blocks
    result = result.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    result = result.replace(/`([^`]+)`/g, '$1');

    // Remove bold
    result = result.replace(/\*\*(.+?)\*\*/g, '$1');

    // Remove italic
    result = result.replace(/\*([^*]+)\*/g, '$1');
    result = result.replace(/_([^_]+)_/g, '$1');

    // Remove strikethrough
    result = result.replace(/~~([^~]+)~~/g, '$1');

    // Remove links
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove headers
    result = result.replace(/^#{1,6}\s+/gm, '');

    // Remove thinking tags
    result = result.replace(/<think>[\s\S]*?<\/think>/g, '');

    return result;
  }

  /**
   * Check if content contains code blocks
   */
  static hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }

  /**
   * Extract all code blocks from content
   */
  static extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const blocks: Array<{ language: string; code: string }> = [];
    const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
    let match: RegExpMatchArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2] || ''
      });
    }

    return blocks;
  }
}

