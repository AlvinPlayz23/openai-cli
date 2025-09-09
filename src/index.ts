#!/usr/bin/env node

// Suppress punycode deprecation warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  // Ignore deprecation warnings for the punycode module
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  // Show other warnings
  console.warn(warning.message);
});

import { Command } from 'commander';
import { GlobalMCPManager } from './mcp/manager';
import { WelcomeScreen } from './ui/screens/welcome';

// Export MCP module for external use
export * from './mcp';

const packageJson = require('../package.json');

const program = new Command();

program
  .name('openai-cli')
  .description('OpenAI CLI Coding Agent - Your intelligent programming assistant')
  .version(packageJson.version);

program
  .action(async () => {
    try {
      const { StorageService } = await import('./services/storage');
      StorageService.initializeConfig();

      // Update MCP configuration (fix old configurations)
      StorageService.updateMcpConfig();

      // Initialize system MCP service
      const mcpManager = GlobalMCPManager.getInstance();
      await mcpManager.initialize();

      // Start the main interface
      const welcome = new WelcomeScreen();
      await welcome.show();
    } catch (error) {
      console.error('Failed to start:', error);
      process.exit(1);
    }
  });

program.parse(); 