using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;

namespace YUGA.Editor
{
    [InitializeOnLoad]
    public class ErrorAutoFix
    {
        private static List<LogEntry> errorLog = new List<LogEntry>();
        private static bool isFixing = false;
        
        static ErrorAutoFix()
        {
            Application.logMessageReceived += OnLogMessage;
        }
        
        private static void OnLogMessage(string condition, string stackTrace, LogType type)
        {
            if (type == LogType.Error || type == LogType.Exception)
            {
                var entry = new LogEntry
                {
                    message = condition,
                    stackTrace = stackTrace,
                    timestamp = System.DateTime.Now
                };
                
                errorLog.Add(entry);
                
                if (errorLog.Count > 50)
                {
                    errorLog.RemoveAt(0);
                }
                
                if (YUGASettings.Instance.autoFixErrors && !isFixing)
                {
                    SuggestFix(entry);
                }
            }
        }
        
        private static async void SuggestFix(LogEntry error)
        {
            isFixing = true;
            
            try
            {
                var settings = YUGASettings.Instance;
                var client = new HttpClient();
                
                var requestData = new
                {
                    error = error.message,
                    stackTrace = error.stackTrace,
                    language = "csharp"
                };
                
                var json = JsonUtility.ToJson(requestData);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                
                var response = await client.PostAsync(
                    $"{settings.apiEndpoint}/api/ai/debug-code",
                    content
                );
                
                if (response.IsSuccessStatusCode)
                {
                    var responseText = await response.Content.ReadAsStringAsync();
                    var result = JsonUtility.FromJson<DebugResponse>(responseText);
                    
                    ShowFixSuggestion(error, result.suggestion);
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"YUGA Auto-Fix failed: {e.Message}");
            }
            finally
            {
                isFixing = false;
            }
        }
        
        private static void ShowFixSuggestion(LogEntry error, string suggestion)
        {
            if (EditorUtility.DisplayDialog(
                "YUGA AI - Error Fix Suggestion",
                $"Error: {error.message}\n\nSuggested Fix:\n{suggestion}\n\nWould you like to see more details?",
                "Open Error Panel",
                "Dismiss"
            ))
            {
                ErrorPanelWindow.ShowWindow(error, suggestion);
            }
        }
        
        [System.Serializable]
        private class LogEntry
        {
            public string message;
            public string stackTrace;
            public System.DateTime timestamp;
        }
        
        [System.Serializable]
        private class DebugResponse
        {
            public string suggestion;
            public string fixedCode;
        }
    }
    
    public class ErrorPanelWindow : EditorWindow
    {
        private string errorMessage;
        private string suggestion;
        private Vector2 scrollPos;
        
        public static void ShowWindow(object error, string suggestion)
        {
            var window = GetWindow<ErrorPanelWindow>("YUGA Error Fix");
            window.errorMessage = error.ToString();
            window.suggestion = suggestion;
            window.Show();
        }
        
        private void OnGUI()
        {
            GUILayout.Label("Error Details", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
            
            GUILayout.Label("Error:", EditorStyles.miniBoldLabel);
            EditorGUILayout.TextArea(errorMessage, GUILayout.Height(100));
            
            EditorGUILayout.Space();
            
            GUILayout.Label("AI Suggestion:", EditorStyles.miniBoldLabel);
            EditorGUILayout.TextArea(suggestion, GUILayout.Height(200));
            
            EditorGUILayout.EndScrollView();
            
            EditorGUILayout.Space();
            
            if (GUILayout.Button("Copy Suggestion"))
            {
                EditorGUIUtility.systemCopyBuffer = suggestion;
                ShowNotification(new GUIContent("Copied!"));
            }
        }
    }
}
