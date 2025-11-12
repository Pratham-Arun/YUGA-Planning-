using UnityEngine;
using UnityEditor;
using System.IO;

namespace YUGA.Editor
{
    /// <summary>
    /// ScriptableObject for storing YUGA plugin settings
    /// </summary>
    public class YUGASettings : ScriptableObject
    {
        public string apiEndpoint = "http://localhost:4000";
        public string defaultModel = "gpt-4";
        public string defaultLanguage = "csharp";
        public bool autoImport = false;
        public bool enableErrorCapture = true;
        public bool debugMode = false;
        public int requestTimeout = 30;
        public int maxRetries = 3;
        
        private static YUGASettings instance;
        
        public static YUGASettings Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = GetOrCreateSettings();
                }
                return instance;
            }
        }
        
        private static YUGASettings GetOrCreateSettings()
        {
            // Try to find existing settings
            string[] guids = AssetDatabase.FindAssets("t:YUGASettings");
            
            if (guids.Length > 0)
            {
                string path = AssetDatabase.GUIDToAssetPath(guids[0]);
                return AssetDatabase.LoadAssetAtPath<YUGASettings>(path);
            }
            
            // Create new settings
            var settings = CreateInstance<YUGASettings>();
            
            // Ensure Editor folder exists
            string editorPath = "Assets/Editor";
            if (!AssetDatabase.IsValidFolder(editorPath))
            {
                AssetDatabase.CreateFolder("Assets", "Editor");
            }
            
            string assetPath = "Assets/Editor/YUGASettings.asset";
            AssetDatabase.CreateAsset(settings, assetPath);
            AssetDatabase.SaveAssets();
            
            return settings;
        }
        
        public void Save()
        {
            EditorUtility.SetDirty(this);
            AssetDatabase.SaveAssets();
        }
    }
    
    /// <summary>
    /// Settings window accessible from Window menu
    /// </summary>
    public class YUGASettingsWindow : EditorWindow
    {
        private Vector2 scrollPos;
        
        [MenuItem("Window/YUGA/Settings")]
        public static void ShowWindow()
        {
            var window = GetWindow<YUGASettingsWindow>("YUGA Settings");
            window.minSize = new Vector2(400, 500);
        }
        
        private void OnGUI()
        {
            GUILayout.Label("YUGA Engine Settings", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
            
            var settings = YUGASettings.Instance;
            
            // Connection Settings
            GUILayout.Label("Connection", EditorStyles.boldLabel);
            settings.apiEndpoint = EditorGUILayout.TextField("API Endpoint", settings.apiEndpoint);
            EditorGUILayout.HelpBox("Backend server URL (default: http://localhost:4000)", MessageType.Info);
            
            EditorGUILayout.Space();
            
            // AI Model Settings
            GUILayout.Label("AI Models", EditorStyles.boldLabel);
            
            string[] models = new string[] { "gpt-4", "gpt-3.5-turbo", "claude-3.5-sonnet", "gemini-1.5-pro" };
            int modelIndex = System.Array.IndexOf(models, settings.defaultModel);
            if (modelIndex < 0) modelIndex = 0;
            
            modelIndex = EditorGUILayout.Popup("Default Model", modelIndex, models);
            settings.defaultModel = models[modelIndex];
            
            string[] languages = new string[] { "csharp", "javascript", "typescript", "python" };
            int langIndex = System.Array.IndexOf(languages, settings.defaultLanguage);
            if (langIndex < 0) langIndex = 0;
            
            langIndex = EditorGUILayout.Popup("Default Language", langIndex, languages);
            settings.defaultLanguage = languages[langIndex];
            
            EditorGUILayout.Space();
            
            // Behavior Settings
            GUILayout.Label("Behavior", EditorStyles.boldLabel);
            settings.autoImport = EditorGUILayout.Toggle("Auto-Import Generated Code", settings.autoImport);
            settings.enableErrorCapture = EditorGUILayout.Toggle("Enable Error Capture", settings.enableErrorCapture);
            settings.debugMode = EditorGUILayout.Toggle("Debug Mode", settings.debugMode);
            
            if (settings.debugMode)
            {
                EditorGUILayout.HelpBox("Debug mode logs all API requests and responses", MessageType.Warning);
            }
            
            EditorGUILayout.Space();
            
            // Advanced Settings
            GUILayout.Label("Advanced", EditorStyles.boldLabel);
            settings.requestTimeout = EditorGUILayout.IntSlider("Request Timeout (s)", settings.requestTimeout, 10, 120);
            settings.maxRetries = EditorGUILayout.IntSlider("Max Retries", settings.maxRetries, 0, 5);
            
            EditorGUILayout.EndScrollView();
            
            EditorGUILayout.Space();
            
            // Action Buttons
            EditorGUILayout.BeginHorizontal();
            
            if (GUILayout.Button("Test Connection", GUILayout.Height(30)))
            {
                TestConnection();
            }
            
            if (GUILayout.Button("Reset to Defaults", GUILayout.Height(30)))
            {
                if (EditorUtility.DisplayDialog("Reset Settings", "Reset all settings to default values?", "Yes", "No"))
                {
                    ResetToDefaults();
                }
            }
            
            EditorGUILayout.EndHorizontal();
            
            EditorGUILayout.Space();
            
            if (GUILayout.Button("Save Settings", GUILayout.Height(35)))
            {
                settings.Save();
                ShowNotification(new GUIContent("Settings saved!"));
            }
        }
        
        private async void TestConnection()
        {
            EditorUtility.DisplayProgressBar("Testing Connection", "Connecting to YUGA backend...", 0.5f);
            
            try
            {
                bool connected = await AIManager.TestConnection();
                
                EditorUtility.ClearProgressBar();
                
                if (connected)
                {
                    EditorUtility.DisplayDialog("Connection Test", "✓ Successfully connected to YUGA Engine!", "OK");
                }
                else
                {
                    EditorUtility.DisplayDialog("Connection Test", "✗ Failed to connect to backend.\n\nMake sure the server is running:\nnpm run api", "OK");
                }
            }
            catch (System.Exception e)
            {
                EditorUtility.ClearProgressBar();
                EditorUtility.DisplayDialog("Connection Test", $"✗ Error: {e.Message}\n\nMake sure backend is running at:\n{YUGASettings.Instance.apiEndpoint}", "OK");
            }
        }
        
        private void ResetToDefaults()
        {
            var settings = YUGASettings.Instance;
            settings.apiEndpoint = "http://localhost:4000";
            settings.defaultModel = "gpt-4";
            settings.defaultLanguage = "csharp";
            settings.autoImport = false;
            settings.enableErrorCapture = true;
            settings.debugMode = false;
            settings.requestTimeout = 30;
            settings.maxRetries = 3;
            settings.Save();
            ShowNotification(new GUIContent("Settings reset to defaults"));
        }
    }
    
    /// <summary>
    /// Unity Preferences integration
    /// </summary>
    static class YUGASettingsProvider
    {
        [SettingsProvider]
        public static SettingsProvider CreateYUGASettingsProvider()
        {
            var provider = new SettingsProvider("Preferences/YUGA", SettingsScope.User)
            {
                label = "YUGA Engine",
                guiHandler = (searchContext) =>
                {
                    var settings = YUGASettings.Instance;
                    
                    EditorGUILayout.LabelField("YUGA AI Assistant Settings", EditorStyles.boldLabel);
                    EditorGUILayout.Space();
                    
                    settings.apiEndpoint = EditorGUILayout.TextField("API Endpoint", settings.apiEndpoint);
                    settings.defaultModel = EditorGUILayout.TextField("Default Model", settings.defaultModel);
                    settings.enableErrorCapture = EditorGUILayout.Toggle("Enable Error Capture", settings.enableErrorCapture);
                    
                    EditorGUILayout.Space();
                    
                    if (GUILayout.Button("Open Full Settings"))
                    {
                        YUGASettingsWindow.ShowWindow();
                    }
                },
                keywords = new System.Collections.Generic.HashSet<string>(new[] { "YUGA", "AI", "Code Generation", "Assistant" })
            };
            
            return provider;
        }
    }
}
