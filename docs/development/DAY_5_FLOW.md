# Day 5: Basic Flow Integration

## 1. Frontend Flow
```typescript
interface GenerationRequest {
  prompt: string;
  projectId: string;
  context?: {
    files?: string[];
    scene?: string;
  };
}

interface GenerationResponse {
  files: {
    path: string;
    content: string;
    type: 'create' | 'modify';
  }[];
  explanation: string;
}

// API Service
const generateCode = async (request: GenerationRequest): Promise<GenerationResponse> => {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
};
```

## 2. Backend Integration
- Add request validation
- Implement mock response
- Create diff generator
- Add file templating

## 3. Unity Plugin Updates
```csharp
[Serializable]
public class FileOperation
{
    public string path;
    public string content;
    public string type;
}

public class FileImporter
{
    public static void ImportFiles(FileOperation[] files)
    {
        foreach (var file in files)
        {
            string fullPath = Path.Combine(Application.dataPath, file.path);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
            File.WriteAllText(fullPath, file.content);
        }
        AssetDatabase.Refresh();
    }
}
```

## 4. Testing Flow
1. Enter prompt in dashboard
2. Receive mock response
3. Review changes in diff view
4. Apply changes
5. Import in Unity
6. Verify compilation

## 5. Error Handling
- Add error boundaries
- Implement retry logic
- Add validation
- Create error messages