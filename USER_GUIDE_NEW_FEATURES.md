# Catwalk CLI - New Features User Guide

## 🎉 What's New

Catwalk CLI has been enhanced with powerful new features to improve your coding experience!

---

## ⌨️ ESC Key Features

### 1. Double ESC to Clear Input

**How it works:**
- Press **ESC** once → Shows "Press ESC again to clear" prompt
- Press **ESC** again within 500ms → Clears your entire input
- Wait more than 500ms → ESC counter resets

**Example:**
```
> This is a long message I want to clear
> [Press ESC]
Press ESC again to clear.
> [Press ESC again within 500ms]
>                                    ← Input cleared!
```

**Use cases:**
- Made a mistake and want to start over
- Changed your mind about what to ask
- Want to quickly clear a long message

---

### 2. ESC to Cancel AI Requests

**How it works:**
- While AI is responding, press **ESC** to cancel the request
- Shows "✗ Request cancelled by user" message
- Immediately returns to input prompt

**Example:**
```
> Write a very long essay about...

AI: Let me write a comprehensive essay...
[AI starts streaming response]
[Press ESC to cancel]

✗ Request cancelled by user

>                                    ← Ready for new input!
```

**Use cases:**
- AI is taking too long
- You realized you asked the wrong question
- You want to refine your prompt
- You need to interrupt and ask something else

---

### 3. ESC to Hide Suggestions

**How it works:**
- When command or file suggestions are showing, press **ESC** to hide them
- Doesn't affect your input text

**Example:**
```
> /
┌─ Commands ─────────────────┐
│ > /help                     │
│   /config                   │
│   /clear                    │
└─────────────────────────────┘
[Press ESC]
> /                            ← Suggestions hidden, input preserved
```

---

## 📁 Configuration Folder

### New Location: `~/.catwalk/`

**What changed:**
- Configuration folder renamed from `.openai-cli` to `.catwalk`
- All settings, history, and MCP configurations stored here

**Location by OS:**
- **Windows:** `C:\Users\YourName\.catwalk\`
- **macOS:** `/Users/YourName/.catwalk/`
- **Linux:** `/home/yourname/.catwalk/`

**Files stored:**
- `config.json` - Your API settings
- `mcp-config.json` - MCP server configurations
- `history.json` - Command history (if enabled)

**Migration:**
If you had an existing `.openai-cli` folder, you may want to copy your config:
```bash
# Windows (PowerShell)
Copy-Item -Path "$env:USERPROFILE\.openai-cli\config.json" -Destination "$env:USERPROFILE\.catwalk\config.json"

# macOS/Linux
cp ~/.openai-cli/config.json ~/.catwalk/config.json
```

---

## 🎮 Keyboard Shortcuts Reference

### Input Control
| Key | Action |
|-----|--------|
| **ESC** (once) | Hide suggestions OR show "Press ESC again to clear" |
| **ESC** (twice) | Clear input buffer |
| **ESC** (during AI) | Cancel AI request |
| **Enter** | Send message or select suggestion |
| **↑ / ↓** | Navigate suggestions |
| **← / →** | Move cursor in input |
| **Backspace** | Delete character |
| **Ctrl+C** | Exit with history check |

### During AI Response
| Key | Action |
|-----|--------|
| **ESC** | Cancel the current AI request |
| **Ctrl+O** | Toggle tool output visibility |
| **Ctrl+R** | Toggle reasoning visibility |

### Commands
| Command | Description |
|---------|-------------|
| `/help` | Show help menu |
| `/config` | Open configuration |
| `/clear` | Clear conversation history |
| `/exit` or `/quit` | Exit the CLI |

---

## 💡 Tips & Tricks

### 1. Quick Input Clearing
Instead of holding backspace, just press **ESC** twice to clear everything!

### 2. Cancel Long Responses
If AI starts writing a very long response you don't need, press **ESC** to stop it and ask a better question.

### 3. Experiment Freely
With easy cancellation, you can experiment with different prompts without waiting for long responses to finish.

### 4. Suggestion Navigation
Use **↑/↓** to navigate suggestions, **Enter** to select, or **ESC** to dismiss.

### 5. File References
Use `@filename` to reference files in your prompts. Suggestions will appear automatically!

---

## 🐛 Troubleshooting

### ESC Not Working?
- Make sure your terminal supports raw mode
- Try pressing ESC once and waiting for the prompt
- Check that no other program is capturing ESC key

### AI Request Won't Cancel?
- Press ESC firmly (not too fast)
- Wait a moment for the cancellation to process
- If stuck, use Ctrl+C to exit gracefully

### Config Folder Not Found?
- Run `catwalk` once to create the folder automatically
- Check the correct path for your OS (see above)
- Ensure you have write permissions in your home directory

---

## 🔄 What's Next?

### Upcoming Features (Planned)
1. **Enhanced Config Menu**
   - Visual improvements with icons
   - Quick presets (OpenAI, Azure, Local)
   - Test connection button
   - Import/export config

2. **Better Visual Feedback**
   - Loading spinner with "thinking" messages
   - Context summary display
   - Footer with keyboard shortcuts
   - Auto-accept indicator

3. **Input Enhancements** (Optional)
   - Multi-line input support
   - Syntax highlighting
   - Ghost text autocomplete

---

## 📚 Additional Resources

- **Main README:** See `README.md` for installation and setup
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md` for technical details
- **Enhancement Plan:** See `CATWALK_ENHANCEMENTS.md` for roadmap

---

## 🎯 Quick Start

1. **Install/Update:**
   ```bash
   npm link
   ```

2. **Run:**
   ```bash
   catwalk
   ```

3. **Try ESC features:**
   - Type something and press ESC twice to clear
   - Ask a question and press ESC to cancel
   - Type `/` and press ESC to hide suggestions

4. **Configure:**
   ```bash
   catwalk
   > /config
   ```

---

## 💬 Feedback

If you encounter any issues or have suggestions for improvements, please let us know!

**Enjoy your enhanced Catwalk CLI experience!** 🚀

---

**Version:** 0.2.4  
**Last Updated:** 2025-11-07  
**New Features:** ESC interrupt, folder rename, abort signal support

