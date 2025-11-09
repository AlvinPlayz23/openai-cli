# Catwalk CLI Enhancements - Implementation Plan

## Overview
This document outlines the enhancements being made to Catwalk CLI based on gemini-cli's components and patterns.

---

## ✅ Completed Tasks

### 1. Folder Rename: `.openai-cli` → `.catwalk`
**Status:** ✅ COMPLETE

**Changes Made:**
- Updated `src/services/storage.ts`:
  - Changed `CONFIG_DIR` from `.openai-cli` to `.catwalk`
  - Translated Chinese comments to English

**Files Modified:**
- `src/services/storage.ts` (line 46)

**Result:**
- Configuration folder is now `~/.catwalk/` instead of `~/.openai-cli/`
- All config files will be stored in the new location
- Build passes with 0 errors

---

### 2. ESC to Interrupt Functionality
**Status:** ✅ COMPLETE

**Features Implemented:**
1. **Double ESC to Clear Input:**
   - First ESC press: Shows "Press ESC again to clear" prompt
   - Second ESC press (within 500ms): Clears the input buffer
   - Timeout after 500ms resets the ESC counter
   - ESC also hides suggestions if they're showing

2. **ESC to Cancel AI Requests:**
   - Added `AbortController` support to OpenAI service
   - AI requests can now be cancelled mid-stream
   - Shows "✗ Request cancelled by user" message
   - Resets chat state to allow new input
   - Properly cleans up loading animations

**Files Modified:**
- `src/services/openai.ts`:
  - Added `signal?: AbortSignal` to `StreamChatOptions`
  - Pass abort signal to OpenAI API
  - Check for abort in stream loop
  - Don't retry if request was cancelled
  - Translated Chinese comments to English

- `src/ui/components/message-handler.ts`:
  - Added `getAbortSignal?: () => AbortSignal | null` to callbacks
  - Pass abort signal to `streamChat` call
  - Translated Chinese comments to English

- `src/ui/pages/main.ts`:
  - Added `abortController: AbortController | null` property
  - Added `startAIRequest()` method to create abort controller
  - Added `cancelCurrentRequest()` method to abort requests
  - Enhanced ESC key handling with double-press support
  - Added ESC press counter and timer
  - Wrap AI request in try-catch to handle cancellation
  - Provide abort signal through callbacks
  - Translated Chinese comments to English

**Result:**
- ✅ Users can press ESC twice to clear input
- ✅ Users can press ESC during AI response to cancel
- ✅ Visual feedback for both actions
- ✅ Proper cleanup and state management
- ✅ Build passes with 0 errors

---

## 🚧 In Progress Tasks

### 3. Enhanced Input/Prompt Component (Ink-style)
**Status:** 📋 PLANNED

**Reference:** `gemini-cli/packages/cli/src/ui/components/InputPrompt.tsx`

**Current Status:**
- Basic input handling is working well
- ESC functionality is complete
- Suggestions system is functional

**Potential Enhancements (Optional):**
- Multi-line input support with text wrapping
- Syntax highlighting for commands and file paths
- Ghost text/autocomplete preview
- Visual cursor with inverse highlighting
- Placeholder text when empty
- Border with rounded corners
- Dynamic width based on terminal size
- Smooth scrolling for long inputs

**Note:** Current input system is functional and meets requirements. These enhancements are optional improvements for future consideration.

---

### 4. Revamped Config Menu
**Status:** 📋 PLANNED (Next Priority)

**Current Implementation:**
- Basic menu with inquirer prompts
- Functional but minimal visual design
- All core features working

**Planned Improvements:**
1. **Visual Enhancements:**
   - Better boxen layouts with colors
   - Icons for each config option (🔑 API Key, 🌐 Base URL, 🤖 Model, etc.)
   - Current value display in menu
   - Validation status indicators
   - Color-coded sections

2. **Better UX:**
   - Inline editing with preview
   - Validation before saving
   - Undo/reset options
   - Quick presets (OpenAI, Azure, Local, etc.)
   - Test connection button

3. **New Features:**
   - Import/export config
   - Config templates
   - Environment variable support
   - Config diff viewer

**Reference Files:**
- `gemini-cli/packages/cli/src/ui/components/ModelDialog.tsx`
- `gemini-cli/packages/cli/src/ui/components/EditorSettingsDialog.tsx`

**Priority:** Medium - Current config works, but UX could be improved

---

## 📋 Pending Tasks

### 5. Additional UI Components

**From gemini-cli to integrate:**

1. **Loading Spinner with Thought Display**
   - Show AI "thinking" messages
   - Elapsed time counter
   - Smooth animations
   - Reference: `gemini-cli/packages/cli/src/ui/components/LoadingIndicator.tsx`

2. **Context Summary Display**
   - Show attached files count
   - MCP servers status
   - Token usage indicator
   - Reference: `gemini-cli/packages/cli/src/ui/components/ContextSummaryDisplay.tsx`

3. **Footer Component**
   - Keyboard shortcuts help
   - Current mode indicator
   - Status messages
   - Reference: `gemini-cli/packages/cli/src/ui/components/Footer.tsx`

4. **Auto-Accept Indicator**
   - Visual feedback for auto-approval mode
   - YOLO mode warning
   - Reference: `gemini-cli/packages/cli/src/ui/components/AutoAcceptIndicator.tsx`

---

## 🎯 Implementation Priority

### Phase 1: Core Functionality (Current)
1. ✅ Folder rename (`.openai-cli` → `.catwalk`)
2. 🚧 ESC to interrupt
3. 🚧 Enhanced input component

### Phase 2: Visual Improvements
4. 📋 Revamped config menu
5. 📋 Loading spinner with thoughts
6. 📋 Context summary display

### Phase 3: Polish
7. 📋 Footer with shortcuts
8. 📋 Auto-accept indicator
9. 📋 Additional visual feedback

---

## 🔧 Technical Notes

### ESC Interrupt Implementation

**Key Components:**
1. **Input Handler** (`src/ui/components/input-handler.ts`)
   - Add ESC key detection
   - Track press count and timing
   - Show visual prompt

2. **Main Page** (`src/ui/pages/main.ts`)
   - Add abort controller for AI requests
   - Handle interrupt signal
   - Clean up on cancel

3. **Response Manager** (`src/ui/components/responses.ts`)
   - Support cancellation
   - Show cancellation message
   - Reset state properly

**AbortController Pattern:**
```typescript
private abortController: AbortController | null = null;

async sendMessage(message: string) {
  this.abortController = new AbortController();
  
  try {
    await openAIService.chat({
      messages: this.messages,
      signal: this.abortController.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(chalk.yellow('Request cancelled'));
    }
  }
}

cancelCurrentRequest() {
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = null;
  }
}
```

---

## 📊 Progress Tracking

- [x] Folder rename (`.openai-cli` → `.catwalk`)
- [x] ESC to interrupt functionality (double-press to clear, cancel AI requests)
- [x] Abort signal support in OpenAI service
- [x] Chinese to English translation in core files
- [ ] Enhanced input component (optional)
- [ ] Revamped config menu (next priority)
- [ ] Loading spinner with thoughts
- [ ] Context summary display
- [ ] Footer component
- [ ] Auto-accept indicator

---

## 🎨 Design Principles

1. **Consistency:** Follow gemini-cli's visual patterns
2. **Simplicity:** Keep the class-based architecture
3. **Performance:** Avoid unnecessary re-renders
4. **Accessibility:** Clear visual feedback
5. **Maintainability:** Well-documented code

---

## 📝 Notes

- All Chinese comments are being translated to English
- Maintaining backward compatibility with existing features
- Using ANSI escape codes instead of Ink (to keep class-based architecture)
- Testing each feature thoroughly before moving to next phase

---

**Last Updated:** 2025-11-07
**Status:** Phase 1 in progress

