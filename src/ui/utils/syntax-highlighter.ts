/**
 * Syntax Highlighter - Code highlighting utility adapted from cn-cli-components
 * Uses lowlight for syntax highlighting with customizable themes
 */

import chalk from 'chalk';
import { common, createLowlight } from 'lowlight';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);

/**
 * Language aliases for better detection
 */
const LANGUAGE_ALIASES: { [key: string]: string } = {
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'json': 'json',
  'html': 'xml',
  'htm': 'xml',
};

/**
 * Detect language from code content or filename
 */
export function detectLanguage(code: string, filename?: string): string {
  // Try to detect from filename extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext) {
      // Check if it's a known language
      if (lowlight.registered(ext)) {
        return ext;
      }
      // Check aliases
      if (LANGUAGE_ALIASES[ext]) {
        return LANGUAGE_ALIASES[ext];
      }
    }
  }

  // Try to detect from code content
  // Check for common patterns
  if (code.includes('function') || code.includes('const') || code.includes('let')) {
    return 'javascript';
  }
  if (code.includes('def ') || code.includes('import ') || code.includes('class ')) {
    if (code.includes('self')) return 'python';
    return 'javascript';
  }
  if (code.includes('<?php')) {
    return 'php';
  }
  if (code.includes('<html') || code.includes('<!DOCTYPE')) {
    return 'xml';
  }

  // Default to plaintext
  return 'plaintext';
}

/**
 * Theme colors for syntax highlighting
 */
export interface SyntaxTheme {
  keyword: (text: string) => string;
  string: (text: string) => string;
  number: (text: string) => string;
  comment: (text: string) => string;
  function: (text: string) => string;
  class: (text: string) => string;
  operator: (text: string) => string;
  punctuation: (text: string) => string;
  variable: (text: string) => string;
  property: (text: string) => string;
  default: (text: string) => string;
}

/**
 * Default theme (dark mode friendly)
 */
export const defaultTheme: SyntaxTheme = {
  keyword: (text) => chalk.magenta(text),
  string: (text) => chalk.green(text),
  number: (text) => chalk.cyan(text),
  comment: (text) => chalk.gray(text),
  function: (text) => chalk.blue(text),
  class: (text) => chalk.yellow(text),
  operator: (text) => chalk.white(text),
  punctuation: (text) => chalk.white(text),
  variable: (text) => chalk.white(text),
  property: (text) => chalk.cyan(text),
  default: (text) => chalk.white(text),
};

/**
 * Light theme
 */
export const lightTheme: SyntaxTheme = {
  keyword: (text) => chalk.magenta.bold(text),
  string: (text) => chalk.green(text),
  number: (text) => chalk.blue(text),
  comment: (text) => chalk.gray(text),
  function: (text) => chalk.blue.bold(text),
  class: (text) => chalk.yellow.bold(text),
  operator: (text) => chalk.black(text),
  punctuation: (text) => chalk.black(text),
  variable: (text) => chalk.black(text),
  property: (text) => chalk.cyan(text),
  default: (text) => chalk.black(text),
};

/**
 * Map lowlight token types to theme colors
 */
function getThemeColor(type: string, theme: SyntaxTheme): (text: string) => string {
  // Map token types to theme properties
  if (type.includes('keyword')) return theme.keyword;
  if (type.includes('string')) return theme.string;
  if (type.includes('number')) return theme.number;
  if (type.includes('comment')) return theme.comment;
  if (type.includes('function')) return theme.function;
  if (type.includes('class')) return theme.class;
  if (type.includes('operator')) return theme.operator;
  if (type.includes('punctuation')) return theme.punctuation;
  if (type.includes('variable')) return theme.variable;
  if (type.includes('property')) return theme.property;
  
  return theme.default;
}

/**
 * Recursively render highlighted nodes
 */
function renderNode(node: any, theme: SyntaxTheme): string {
  if (node.type === 'text') {
    return node.value;
  }

  if (node.type === 'element') {
    const className = node.properties?.className?.[0] || '';
    const colorFn = getThemeColor(className, theme);
    
    if (node.children) {
      const childText = node.children.map((child: any) => renderNode(child, theme)).join('');
      return colorFn(childText);
    }
    
    return '';
  }

  if (node.children) {
    return node.children.map((child: any) => renderNode(child, theme)).join('');
  }

  return '';
}

/**
 * Highlight code with syntax colors
 * @param code - Code to highlight
 * @param language - Programming language
 * @param theme - Color theme to use
 * @returns Highlighted code with ANSI colors
 */
export function highlightCode(
  code: string,
  language: string = 'plaintext',
  theme: SyntaxTheme = defaultTheme
): string {
  try {
    // Normalize language name
    const normalizedLang = LANGUAGE_ALIASES[language] || language;
    
    // Check if language is supported
    if (!lowlight.registered(normalizedLang)) {
      // Return plain text with default color
      return theme.default(code);
    }

    // Highlight the code
    const result = lowlight.highlight(normalizedLang, code);
    
    // Render the highlighted nodes
    return renderNode(result, theme);
  } catch (error) {
    // If highlighting fails, return plain text
    return theme.default(code);
  }
}

/**
 * Highlight a single line of code
 * @param line - Line of code to highlight
 * @param language - Programming language
 * @param theme - Color theme to use
 * @returns Highlighted line with ANSI colors
 */
export function highlightLine(
  line: string,
  language: string = 'plaintext',
  theme: SyntaxTheme = defaultTheme
): string {
  return highlightCode(line, language, theme);
}

/**
 * Highlight code and split into lines
 * @param code - Code to highlight
 * @param language - Programming language
 * @param theme - Color theme to use
 * @returns Array of highlighted lines
 */
export function highlightLines(
  code: string,
  language: string = 'plaintext',
  theme: SyntaxTheme = defaultTheme
): string[] {
  const highlighted = highlightCode(code, language, theme);
  return highlighted.split('\n');
}

/**
 * Get list of supported languages
 */
export function getSupportedLanguages(): string[] {
  return lowlight.listLanguages();
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  const normalizedLang = LANGUAGE_ALIASES[language] || language;
  return lowlight.registered(normalizedLang);
}

/**
 * Register a custom language
 * @param name - Language name
 * @param grammar - Language grammar definition
 */
export function registerLanguage(name: string, grammar: any): void {
  lowlight.register({ [name]: grammar });
}

/**
 * Highlight inline code (for markdown)
 * @param code - Inline code to highlight
 * @param theme - Color theme to use
 * @returns Highlighted inline code
 */
export function highlightInlineCode(
  code: string,
  theme: SyntaxTheme = defaultTheme
): string {
  return chalk.magentaBright(code);
}

