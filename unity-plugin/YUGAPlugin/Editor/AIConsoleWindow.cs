using UnityEngine;
using UnityEditor;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace YUGA.Editor
{
    public class AIConsoleWindow : EditorWindow
    {
        private string prompt = "";
        private string response = "";
        private Vector2 scrollPos;
        private bool isGenerating = false;
        private string selectedLanguage = "csharp";
        
        [MenuItem("Window/YUGA/AI Console")]
        public static void ShowWindow()
        {
            GetWindow<AIConsoleWindow>("YUGA AI Console");
        }
        
        private void OnGUI()
        {
            GUILayout.Label("AI Command Console", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            // Language selector
            EditorGUILayout.BeginHorizontal();
            GUILayout.Label("Language:", GUILayout.Width(70));
            selectedLanguage = EditorGUILayout.Popup(
                selectedLanguage == "csharp" ? 0 : 1,
                new string[] { "C#", "JavaScript" },
                GUILayout.Width(100)
            ) == 0 ? "csharp" : "javascript";
            EditorGUILayout.EndHorizontal();
            
            EditorGUILayout.Space();
            
            // Prompt input
            GUILayout.Label("Describe what you want to create:", EditorStyles.label);
            prompt = EditorGUILayout.TextArea(prompt, GUILayout.Height(80));
            
            EditorGUILayout.Space();
            
            // Generate button
            EditorGUI.BeginDisabledGroup(isGenerating || string.IsNullOrWhiteSpace(prompt));
            if (GUILayout.Button(isGenerating ? "Generating..." : "Generate Code", GUILayout.Height(30)))
            {
                GenerateCode();
            }
            EditorGUI.EndDisabledGroup();
            
            EditorGUILayout.Space();
            
            // Response area
            if (!string.IsNullOrEmpty(response))
            {
                GUILayout.Label("Generated Code:", EditorStyles.boldLabel);
                scrollPos = EditorGUILayout.BeginScrollView(scrollPos, GUILayout.Height(300));
                EditorGUILayout.TextArea(response, GUILayout.ExpandHeight(true));
                EditorGUILayout.EndScrollView();
                
                EditorGUILayout.Space();
                
                EditorGUILayout.BeginHorizontal();
                if (GUILayout.Button("Save to Assets"))
                {
                    SaveGeneratedCode();
                }
                if (GUILayout.Button("Copy to Clipboard"))
                {
                    EditorGUIUtility.systemCopyBuffer = response;
                    ShowNotification(new GUIContent("Copied to clipboard!"));
                }
                EditorGUILayout.EndHorizontal();
            }
            
            // Quick examples
            EditorGUILayout.Space();
            GUILayout.Label("Quick Examples:", EditorStyles.miniLabel);
            if (GUILayout.Button("Player Controller", EditorStyles.miniButton))
            {
                prompt = "Create a player controller with WASD movement and jump";
            }
            if (GUILayout.Button("Enemy AI", EditorStyles.miniButton))
            {
                prompt = "Create an enemy AI that patrols and chases the player when in range";
            }
            if (GUILayout.Button("Inventory System", EditorStyles.miniButton))
            {
                prompt = "Create a simple inventory system with add, remove, and display items";
            }
        }
        
        private async void GenerateCode()
        {
            isGenerating = true;
            response = "";
            
            try
            {
                var settings = YUGASettings.Instance;
                var client = new HttpClient();
                
                var requestData = new
                {
                    prompt = prompt,
                    model = settings.preferredModel,
                    language = selectedLanguage
                };
                
                var json = JsonUtility.ToJson(requestData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                var httpResponse = await client.PostAsync(
                    $"{settings.apiEndpoint}/api/ai/generate-code",
                    content
                );
                
                if (httpResponse.IsSuccessStatusCode)
                {
                    var responseText = await httpResponse.Content.ReadAsStringAsync();
                    var result = JsonUtility.FromJson<CodeGenerationResponse>(responseText);
                    response = result.code;
                }
                else
                {
                    response = $"Error: {httpResponse.StatusCode}\n{await httpResponse.Content.ReadAsStringAsync()}";
                }
            }
            catch (System.Exception e)
            {
                response = $"Error: {e.Message}\n\nMake sure YUGA Engine backend is running at {YUGASettings.Instance.apiEndpoint}";
            }
            finally
            {
                isGenerating = false;
                Repaint();
            }
        }
        
        private void SaveGeneratedCode()
        {
            if (string.IsNullOrEmpty(response)) return;
            
            string folderPath = "Assets/AI_Generated";
            if (!AssetDatabase.IsValidFolder(folderPath))
            {
                AssetDatabase.CreateFolder("Assets", "AI_Generated");
            }
            
            string fileName = EditorUtility.SaveFilePanel(
                "Save Generated Code",
                folderPath,
                "Generated",
                selectedLanguage == "csharp" ? "cs" : "js"
            );
            
            if (!string.IsNullOrEmpty(fileName))
            {
                System.IO.File.WriteAllText(fileName, response);
                AssetDatabase.Refresh();
                ShowNotification(new GUIContent("Code saved!"));
            }
        }
    }
    
    [System.Serializable]
    public class CodeGenerationResponse
    {
        public string code;
        public string model;
    }
}
