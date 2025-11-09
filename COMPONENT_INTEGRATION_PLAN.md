# Component Integration Plan

## Goal
Integrate components from cn-cli-components and gemini-cli into openai-cli, adapting them to work with our class-based architecture.

## Architecture Differences

### cn-cli-components / gemini-cli
- **Framework:** React + Ink (declarative UI)
- **Pattern:** Functional components with hooks
- **State:** React state management
- **Services:** Service container with dependency injection
- **Input:** useInput hook from Ink

### openai-cli (Current)
- **Framework:** Native Node.js (imperative)
- **Pattern:** Class-based components
- **State:** Class properties
- **Services:** Direct imports
- **Input:** Raw stdin handling with ANSI codes

## Integration Strategy

### Approach: **Hybrid Architecture**
1. Keep class-based structure for main logic
2. Extract styling patterns and algorithms from reference components
3. Adapt React components to class methods
4. Use their utilities and helpers directly where possible

## Components to Integrate

### Priority 1: Core UI Components ✨

#### 1. **Enhanced Loading Animation**
**Reference:** `cn-cli-components/LoadingAnimation.tsx`

**What to Extract:**
- Braille-based density animation
- Eased static fade algorithm
- Timing curves

**Integration:**
- Enhance `src/utils/animation.ts`
- Add braille character support
- Implement density-based frames

#### 2. **Better Markdown Rendering**
**Reference:** `cn-cli-components/MarkdownRenderer.tsx`

**What to Extract:**
- Markdown parsing patterns
- Syntax highlighting integration
- Code block handling

**Integration:**
- Create `src/ui/components/markdown-renderer.ts`
- Use with existing stream-renderer.ts
- Integrate with lowlight for syntax highlighting

#### 3. **Improved Slash Command UI**
**Reference:** `cn-cli-components/SlashCommandUI.tsx`

**What to Extract:**
- Command filtering logic
- Layout and styling patterns
- Keyboard navigation

**Integration:**
- Already enhanced in input-handler.ts
- Add fuzzy matching from reference
- Improve visual styling further

#### 4. **TextBuffer for Input Management**
**Reference:** `cn-cli-components/TextBuffer.ts`

**What to Extract:**
- Text manipulation utilities
- Cursor management
- Input history handling

**Integration:**
- Create `src/ui/utils/text-buffer.ts`
- Use in main.ts getUserInput()
- Better input handling

### Priority 2: Utility Components 🛠️

#### 5. **Syntax Highlighter**
**Reference:** `cn-cli-components/SyntaxHighlighter.ts`

**What to Extract:**
- Language detection
- Highlighting logic
- Theme support

**Integration:**
- Create `src/ui/utils/syntax-highlighter.ts`
- Use lowlight (already installed)
- Integrate with markdown renderer

#### 6. **File Search UI**
**Reference:** `cn-cli-components/FileSearchUI.tsx`

**What to Extract:**
- File filtering logic
- Display patterns
- Selection handling

**Integration:**
- Enhance existing `src/ui/components/files.ts`
- Better file search experience
- Fuzzy matching

#### 7. **Input History**
**Reference:** `cn-cli-components/hooks/useUserInput.ts` + `InputHistory`

**What to Extract:**
- History management
- Up/down navigation
- Persistence logic

**Integration:**
- Create `src/ui/utils/input-history.ts`
- Integrate with getUserInput()
- Save/load from storage

### Priority 3: Visual Polish ✨

#### 8. **Status Bar Components**
**Reference:** `cn-cli-components/components/BottomStatusBar.tsx`

**What to Extract:**
- Layout patterns
- Status indicators
- Responsive design

**Integration:**
- Create `src/ui/components/status-bar.ts`
- Show model, context, repo info
- Display at bottom of screen

#### 9. **Loading Text Component**
**Reference:** `cn-cli-components/LoadingText.tsx`

**What to Extract:**
- Text + spinner combination
- Styling patterns

**Integration:**
- Enhance existing loading animation
- Add text alongside spinner

#### 10. **Timer Component**
**Reference:** `cn-cli-components/Timer.tsx`

**What to Extract:**
- Time tracking
- Display formatting

**Integration:**
- Add to status bar
- Show request duration

## Implementation Steps

### Phase 1: Core Utilities (Foundation)

**Step 1.1: Enhanced Loading Animation**
- File: `src/utils/animation.ts`
- Add braille character support
- Implement density-based animation
- Use easing curves

**Step 1.2: TextBuffer Utility**
- File: `src/ui/utils/text-buffer.ts`
- Extract from cn-cli-components
- Adapt to our architecture
- Text manipulation helpers

**Step 1.3: Syntax Highlighter**
- File: `src/ui/utils/syntax-highlighter.ts`
- Language detection
- Code highlighting with lowlight
- Theme support

### Phase 2: Enhanced Rendering

**Step 2.1: Markdown Renderer**
- File: `src/ui/components/markdown-renderer.ts`
- Parse markdown patterns
- Integrate syntax highlighter
- Code block handling

**Step 2.2: Stream Renderer Enhancement**
- File: `src/ui/components/stream-renderer.ts`
- Use new markdown renderer
- Better formatting
- Syntax highlighting

### Phase 3: Input Improvements

**Step 3.1: Input History**
- File: `src/ui/utils/input-history.ts`
- History management
- Up/down navigation
- Persistence

**Step 3.2: Enhanced Input Handler**
- File: `src/ui/pages/main.ts` (getUserInput)
- Use TextBuffer
- Use InputHistory
- Better cursor management

### Phase 4: Visual Components

**Step 4.1: Status Bar**
- File: `src/ui/components/status-bar.ts`
- Model info
- Context usage
- Repo info
- Timer

**Step 4.2: File Search Enhancement**
- File: `src/ui/components/files.ts`
- Better filtering
- Fuzzy matching
- Improved display

## Files to Create

### New Files
1. `src/ui/utils/text-buffer.ts` - Text manipulation utility
2. `src/ui/utils/syntax-highlighter.ts` - Code highlighting
3. `src/ui/utils/input-history.ts` - Command history
4. `src/ui/components/markdown-renderer.ts` - Markdown parsing
5. `src/ui/components/status-bar.ts` - Status display

### Files to Modify
1. `src/utils/animation.ts` - Enhanced loading
2. `src/ui/components/stream-renderer.ts` - Use markdown renderer
3. `src/ui/components/input-handler.ts` - Better suggestions
4. `src/ui/pages/main.ts` - Use new utilities
5. `src/ui/components/files.ts` - Better file search

## Key Patterns to Extract

### From cn-cli-components

**1. Braille Animation Pattern**
```typescript
const BRAILLE_BY_DENSITY = {
  0: ["⠀"],
  1: ["⠁", "⠂", "⠄", "⠈"],
  // ... etc
  8: ["⣿"]
};
```

**2. Easing Curve Pattern**
```typescript
const TIMING_CURVE = [3, 3, 2, 1, 1, 0, 1, 2, 3];
// Hold frames at each density level
```

**3. TextBuffer Pattern**
```typescript
class TextBuffer {
  text: string;
  cursor: number;
  insert(char: string): void;
  delete(): void;
  moveCursor(delta: number): void;
}
```

**4. Markdown Parsing Pattern**
```typescript
const patterns = [
  { regex: /```(\w+)?\n([\s\S]*?)```/g, render: ... },
  { regex: /\*\*(.+?)\*\*/g, render: ... },
  // ... etc
];
```

### From gemini-cli

**1. Slash Command Completion**
```typescript
const filteredCommands = allCommands
  .filter(cmd => cmd.name.includes(filter))
  .sort((a, b) => {
    const aStarts = a.name.startsWith(filter);
    const bStarts = b.name.startsWith(filter);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });
```

**2. Input History Pattern**
```typescript
class InputHistory {
  history: string[] = [];
  index: number = -1;
  
  add(input: string): void;
  previous(): string | null;
  next(): string | null;
  reset(): void;
}
```

## Success Criteria

### Functionality
- ✅ Smooth braille-based loading animation
- ✅ Syntax-highlighted code blocks
- ✅ Better markdown rendering
- ✅ Input history with up/down arrows
- ✅ Enhanced file search
- ✅ Status bar with useful info

### Visual Quality
- ✅ Professional appearance
- ✅ Consistent styling
- ✅ Smooth animations
- ✅ No flickering

### Architecture
- ✅ Maintains class-based structure
- ✅ No breaking changes
- ✅ Clean integration
- ✅ Easy to maintain

## Non-Goals

❌ **Do NOT:**
- Migrate to React/Ink framework
- Copy entire service container system
- Add complex dependency injection
- Break existing functionality
- Over-engineer solutions

✅ **Do:**
- Extract algorithms and patterns
- Adapt to our architecture
- Keep it simple
- Maintain compatibility
- Focus on user experience

## Next Steps

1. Start with Phase 1: Core Utilities
2. Test each component thoroughly
3. Integrate incrementally
4. Get user feedback
5. Iterate and improve

---

**Remember:** We're extracting the best patterns and algorithms, not copying entire architectures. Adapt, don't adopt!

