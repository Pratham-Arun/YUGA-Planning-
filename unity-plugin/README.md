# YUGA Unity Plugin

AI-powered Unity Editor integration for YUGA Engine.

## 🚀 Quick Start

### Installation

**Option 1: Unity Package Manager (Recommended)**
1. Open Unity
2. Go to `Window > Package Manager`
3. Click `+` → `Add package from git URL`
4. Enter: `https://github.com/yourusername/yuga-engine.git?path=/unity-plugin/YUGAPlugin`

**Option 2: Manual Installation**
1. Download the `YUGAPlugin` folder
2. Copy to your Unity project's `Assets/Editor/` directory
3. Unity will automatically import the plugin

**Option 3: Unity Package**
1. Download `YUGA-Plugin.unitypackage` from releases
2. Double-click to import into Unity

### Setup

1. **Start YUGA Backend**
   ```bash
   npm run api
   ```
   Backend runs at `http://localhost:4000`

2. **Configure Plugin**
   - Open `Window > YUGA > Settings`
   - Verify API endpoint: `http://localhost:4000`
   - Click "Test Connection" to verify

3. **Add API Keys** (in backend `.env` file)
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

## ✨ Features

### 🤖 AI Console
Natural language → Unity C# code

**Usage:**
1. Open `Window > YUGA > AI Console`
2. Type: "Create a player controller with WASD movement and jump"
3. Click "Generate Code"
4. Code appears in editor
5. Click "Save to Assets" → saved to `Assets/AI_Generated/`

**Examples:**
- "Create an enemy AI that patrols waypoints"
- "Make a health system with damage and healing"
- "Build an inventory system with slots"

### 🎨 Asset Generator (Coming Soon)
AI-powered texture and 3D model creation

### 🐛 Error Auto-Fix
Automatic debugging assistance

**How it works:**
1. Unity detects an error
2. YUGA captures error + stack trace
3. AI analyzes and suggests fix
4. Fix appears in Error Panel

**Enable/Disable:**
- `Window > YUGA > Settings`
- Toggle "Auto-Fix Errors"

### 🌍 World Builder (Coming Soon)
Generate complete game worlds from descriptions

## 📋 Requirements

- Unity 2021.3 LTS or newer
- .NET Standard 2.1
- YUGA Engine backend running
- Internet connection (for AI APIs)

## 🎯 Usage Examples

### Example 1: Player Controller
```
Prompt: "Create a 3D player controller with WASD movement, 
         mouse look, and space to jump"

Result: Complete PlayerController.cs with:
- Rigidbody movement
- Camera rotation
- Jump mechanics
- Ground detection
```

### Example 2: Enemy AI
```
Prompt: "Create an enemy that patrols between waypoints 
         and chases the player when within 10 units"

Result: EnemyAI.cs with:
- Waypoint patrol system
- Player detection
- Chase behavior
- NavMesh integration
```

### Example 3: Inventory System
```
Prompt: "Create an inventory system with 20 slots, 
         add/remove items, and display in UI"

Result: Multiple files:
- InventorySystem.cs
- Item.cs
- InventoryUI.cs
```

## ⚙️ Configuration

### Settings Window
`Window > YUGA > Settings`

- **API Endpoint**: Backend URL (default: `http://localhost:4000`)
- **Preferred Model**: AI model to use (gpt-4, claude-3.5-sonnet, etc.)
- **Auto-Fix Errors**: Enable/disable automatic error fixing
- **Context Awareness**: Include project context in generation

### Keyboard Shortcuts
- `Ctrl+Shift+Y` - Open AI Console
- `Ctrl+Shift+E` - Open Error Panel

## 🔧 Troubleshooting

### "Connection Failed"
- Ensure backend is running: `npm run api`
- Check API endpoint in Settings
- Verify firewall isn't blocking port 4000

### "API Key Not Configured"
- Add API keys to backend `.env` file
- Restart backend after adding keys

### "Generated Code Has Errors"
- Try more specific prompt
- Include context: "using Unity's new Input System"
- Use Error Auto-Fix to debug

### Plugin Not Appearing
- Check Unity Console for import errors
- Verify files are in `Assets/Editor/YUGAPlugin/`
- Restart Unity

## 🚀 Advanced Usage

### Context-Aware Generation
YUGA analyzes your project to generate contextually appropriate code:

```csharp
// If you have a GameManager.cs, YUGA will reference it
public class NewScript : MonoBehaviour 
{
    void Start() 
    {
        GameManager.Instance.RegisterPlayer(this);
    }
}
```

### Multi-File Generation
Request complex systems:
```
"Create a quest system with QuestManager, Quest class, 
 QuestUI, and example quests"
```

Result: Multiple related files generated together

### Custom Templates (Coming Soon)
Define your own code templates for consistent generation

## 📚 API Reference

### YUGASettings
```csharp
YUGASettings.Instance.apiEndpoint
YUGASettings.Instance.preferredModel
YUGASettings.Instance.autoFixErrors
```

### Programmatic Generation
```csharp
using YUGA.Editor;

// Generate code from script
var result = await AIConsoleWindow.GenerateCode(
    "Create a health system",
    "csharp"
);
```

## 🤝 Contributing

Found a bug? Have a feature request?
- GitHub Issues: https://github.com/yourusername/yuga-engine/issues
- Discord: Coming soon

## 📄 License

MIT License - See LICENSE file

## 🙏 Credits

Built with:
- OpenAI GPT-4
- Anthropic Claude
- Unity Editor API

---

**Need help?** Check `NEXT_STEPS.md` for detailed guides
