/**
 * CN Components - Integrated components from cn-cli-components
 * Centralized exports for easy access
 */

// Action Status (Tool Calling Indicator)
export {
  ActionStatus,
  Timer,
  type ActionStatusOptions,
  type ActionStatusController
} from './action-status';

// Tool Permission (Request & Selector)
export {
  ToolPermissionRequest,
  ToolPermissionSelector,
  type ToolPermissionRequestOptions,
  type ToolPermissionSelectorOptions
} from './tool-permission';

// Status Bar (Bottom Status Bar)
export {
  StatusBar,
  ContextPercentageDisplay,
  ModeIndicator,
  ResponsiveRepoDisplay,
  type StatusBarOptions
} from './status-bar';

// Simple Welcome Screen
export { SimpleWelcomeScreen } from '../screens/welcome-simple';

/**
 * Quick Start Examples:
 * 
 * 1. Tool Calling Indicator:
 * ```typescript
 * import { ActionStatus } from './ui/components/cn-components';
 * 
 * const controller = ActionStatus.show({
 *   message: 'Processing...',
 *   showSpinner: true,
 *   color: 'cyan'
 * });
 * 
 * // Later...
 * controller.stop();
 * ```
 * 
 * 2. Tool Permission Request:
 * ```typescript
 * import { ToolPermissionSelector } from './ui/components/cn-components';
 * 
 * const selector = new ToolPermissionSelector();
 * await selector.show({
 *   toolName: 'edit_file',
 *   toolArgs: { path: 'src/index.ts' },
 *   requestId: 'req-1',
 *   onResponse: (id, approved) => {
 *     console.log(`Permission ${approved ? 'granted' : 'denied'}`);
 *   }
 * });
 * ```
 * 
 * 3. Status Bar:
 * ```typescript
 * import { StatusBar } from './ui/components/cn-components';
 * 
 * StatusBar.show({
 *   model: 'gpt-4',
 *   contextPercentage: 65,
 *   remoteUrl: 'https://github.com/user/repo',
 *   mode: 'normal'
 * });
 * ```
 * 
 * 4. Simple Welcome Screen:
 * ```typescript
 * import { SimpleWelcomeScreen } from './ui/components/cn-components';
 * 
 * const welcome = new SimpleWelcomeScreen();
 * await welcome.show();
 * ```
 */

