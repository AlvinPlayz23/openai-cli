#!/usr/bin/env node

// Suppress punycode deprecation warning
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  // Ignore punycode module deprecation warnings
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    return;
  }
  // Show other warnings
  console.warn(warning.message);
});

import { Command } from 'commander';
import { GlobalMCPManager } from './mcp/manager';
import { MainPage } from './ui/pages/main';

// Export MCP module for external use
export * from './mcp';

const packageJson = require('../package.json');

const program = new Command();

program
  .name('catwalk')
  .description('Catwalk CLI - Your intelligent AI coding assistant')
  .version(packageJson.version);

program
  .action(async () => {
    try {
      const { StorageService } = await import('./services/storage');
      StorageService.initializeConfig();

      // Set Context7 API key from config if available
      const apiConfig = StorageService.getApiConfig();
      if (apiConfig.context7ApiKey) {
        process.env.CONTEXT7_API_KEY = apiConfig.context7ApiKey;
      }

      // Update MCP config (fix old config)
      StorageService.updateMcpConfig();

      // Initialize system MCP services
      const mcpManager = GlobalMCPManager.getInstance();
      await mcpManager.initialize();

      // Start chat interface
      const mainPage = new MainPage();
      await mainPage.show();
    } catch (error) {
      console.error('Startup failed:', error);
      process.exit(1);
    }
  });

program.parse(); 