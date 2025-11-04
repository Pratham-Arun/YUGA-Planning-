# Day 4: Unity Plugin Development

## 1. Plugin Structure
```
/unity-plugin
  /Editor
    /Scripts
      YUGAWindow.cs          # Main editor window
      ProjectManager.cs       # Project management
      APIClient.cs           # API communication
      FileImporter.cs        # File import logic
  /Runtime
    /Scripts
      YUGABehaviour.cs       # Runtime components
      ProjectConfig.cs       # Configuration
```

## 2. Editor Window
```csharp
public class YUGAWindow : EditorWindow
{
    [MenuItem("YUGA/Open Generator")]
    public static void ShowWindow()
    {
        GetWindow<YUGAWindow>("YUGA Generator");
    }

    void OnGUI()
    {
        // UI Implementation
    }
}
```

## 3. API Integration
```csharp
public class APIClient
{
    private const string API_URL = "http://localhost:3000";
    
    public async Task<GenerationResponse> GenerateCode(string prompt)
    {
        // API call implementation
    }
    
    public async Task<bool> ImportFiles(GenerationResponse response)
    {
        // File import implementation
    }
}
```

## 4. Asset Management
- Implement file importing
- Add asset database refresh
- Handle meta files
- Manage script compilation

## 5. Testing
- Create editor tests
- Test file importing
- Validate compilation
- Test API integration