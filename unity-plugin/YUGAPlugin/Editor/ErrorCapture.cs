using UnityEngine;
using UnityEditor;
using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Linq;

namespace YUGA.Editor
{
    /// <summary>
    /// Captures Unity console errors and sends them to AI for debugging
    /// </summary>
    [InitializeOnLoad]
    public static class ErrorCapture
    {
        private static Queue<ErrorEntry> errorQueue = new Queue<ErrorEntry>();
        private static DateTime lastErrorTime = DateTime.MinValue;
        private static string lastErrorMessage = "";
        private const int DEBOUNCE_SECONDS = 5;
        private const int MAX_QUEUE_SIZE = 100;
        private const int CONTEXT_LINES = 10;
        
        static ErrorCapture()
        {
            Application.logMessageReceived += OnLogMessageReceived;
            Debug.Log("[YUGA] Error capture system initialized");
        }
        
        private static void OnLogMessageReceived(string logString, string stackTrace, LogType type)
        {
            // Only capture errors and exceptions
            if (type != LogType.Error && type != LogType.Exception)
            {
                return;
            }
            
            // Check if error capture is enabled
            var settings = YUGASettings.Instance;
            if (!settings.enableErrorCapture)
            {
                return;
            }
            
            // Debounce duplicate errors
            if (logString == lastErrorMessage && 
                (DateTime.Now - lastErrorTime).TotalSeconds < DEBOUNCE_SECONDS)
            {
                return;
            }
            
            lastErrorMessage = logString;
            lastErrorTime = DateTime.Now;
            
            // Create error entry
            var entry = new ErrorEntry
            {
                message = logString,
                stackTrace = stackTrace,
                timestamp = DateTime.Now,
                type = type
            };
            
            // Extract file path and line number from stack trace
            ExtractFileInfo(stackTrace, out string filePath, out int lineNumber);
            entry.filePath = filePath;
            entry.lineNumber = lineNumber;
            
            // Extract code context if file is accessible
            if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath))
            {
                entry.codeContext = ExtractCodeContext(filePath, lineNumber, CONTEXT_LINES);
            }
            
            // Add to queue
            errorQueue.Enqueue(entry);
            
            // Limit queue size
            while (errorQueue.Count > MAX_QUEUE_SIZE)
            {
                errorQueue.Dequeue();
            }
            
            // Process error asynchronously
            ProcessErrorAsync(entry);
        }
        
        private static async void ProcessErrorAsync(ErrorEntry entry)
        {
            try
            {
                var settings = YUGASettings.Instance;
                
                if (settings.debugMode)
                {
                    Debug.Log($"[YUGA] Processing error: {entry.message}");
                }
                
                // Send to AI for debugging
                var response = await AIManager.DebugError(
                    entry.message,
                    entry.stackTrace,
                    entry.codeContext,
                    "csharp",
                    settings.defaultModel
                );
                
                // Show debug suggestion window
                ShowDebugSuggestion(entry, response);
            }
            catch (Exception e)
            {
                if (YUGASettings.Instance.debugMode)
                {
                    Debug.LogWarning($"[YUGA] Error processing failed: {e.Message}");
                }
            }
        }
        
        private static void ExtractFileInfo(string stackTrace, out string filePath, out int lineNumber)
        {
            filePath = null;
            lineNumber = -1;
            
            if (string.IsNullOrEmpty(stackTrace))
            {
                return;
            }
            
            // Pattern: at ClassName.MethodName () [0x00000] in /path/to/file.cs:123
            var match = Regex.Match(stackTrace, @"in (.+\.cs):(\d+)");
            
            if (match.Success)
            {
                filePath = match.Groups[1].Value;
                lineNumber = int.Parse(match.Groups[2].Value);
            }
        }
        
        private static string ExtractCodeContext(string filePath, int lineNumber, int contextLines)
        {
            try
            {
                if (!File.Exists(filePath) || lineNumber < 1)
                {
                    return null;
                }
                
                var lines = File.ReadAllLines(filePath);
                
                if (lineNumber > lines.Length)
                {
                    return null;
                }
                
                int startLine = Math.Max(0, lineNumber - contextLines - 1);
                int endLine = Math.Min(lines.Length - 1, lineNumber + contextLines - 1);
                
                var contextBuilder = new System.Text.StringBuilder();
                
                for (int i = startLine; i <= endLine; i++)
                {
                    string marker = (i == lineNumber - 1) ? ">>> " : "    ";
                    contextBuilder.AppendLine($"{marker}{i + 1}: {lines[i]}");
                }
                
                return contextBuilder.ToString();
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[YUGA] Failed to extract code context: {e.Message}");
                return null;
            }
        }
        
        private static void ShowDebugSuggestion(ErrorEntry entry, DebugResponse response)
        {
            EditorApplication.delayCall += () =>
            {
                DebugSuggestionWindow.ShowWindow(entry, response);
            };
        }
        
        public static List<ErrorEntry> GetRecentErrors(int count = 10)
        {
            return errorQueue.Reverse().Take(count).ToList();
        }
        
        public static void ClearErrorQueue()
        {
            errorQueue.Clear();
        }
    }
    
    [Serializable]
    public class ErrorEntry
    {
        public string message;
        public string stackTrace;
        public string filePath;
        public int lineNumber;
        public string codeContext;
        public DateTime timestamp;
        public LogType type;
    }
    
    public class DebugSuggestionWindow : EditorWindow
    {
        private ErrorEntry error;
        private DebugResponse suggestion;
        private Vector2 scrollPos;
        
        public static void ShowWindow(ErrorEntry error, DebugResponse suggestion)
        {
            var window = GetWindow<DebugSuggestionWindow>("YUGA Debug Assistant");
            window.error = error;
            window.suggestion = suggestion;
            window.minSize = new Vector2(500, 400);
            window.Show();
        }
        
        private void OnGUI()
        {
            if (error == null || suggestion == null)
            {
                GUILayout.Label("No debug information available");
                return;
            }
            
            GUILayout.Label("YUGA AI Debug Assistant", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
            
            // Error Information
            GUILayout.Label("Error:", EditorStyles.miniBoldLabel);
            EditorGUILayout.HelpBox(error.message, MessageType.Error);
            
            EditorGUILayout.Space();
            
            // AI Explanation
            GUILayout.Label("AI Analysis:", EditorStyles.miniBoldLabel);
            EditorGUILayout.HelpBox(suggestion.explanation, MessageType.Info);
            
            EditorGUILayout.Space();
            
            // Confidence
            GUILayout.Label($"Confidence: {suggestion.confidence:P0}", EditorStyles.miniLabel);
            
            EditorGUILayout.Space();
            
            // Code Context
            if (!string.IsNullOrEmpty(error.codeContext))
            {
                GUILayout.Label("Code Context:", EditorStyles.miniBoldLabel);
                EditorGUILayout.TextArea(error.codeContext, GUILayout.Height(150));
                EditorGUILayout.Space();
            }
            
            // Suggested Fix
            GUILayout.Label("Suggested Fix:", EditorStyles.miniBoldLabel);
            EditorGUILayout.TextArea(suggestion.suggestedFix, GUILayout.Height(200));
            
            EditorGUILayout.EndScrollView();
            
            EditorGUILayout.Space();
            
            // Action Buttons
            EditorGUILayout.BeginHorizontal();
            
            if (GUILayout.Button("Apply Fix", GUILayout.Height(30)))
            {
                ApplyFix();
            }
            
            if (GUILayout.Button("Copy Fix", GUILayout.Height(30)))
            {
                EditorGUIUtility.systemCopyBuffer = suggestion.suggestedFix;
                ShowNotification(new GUIContent("Fix copied to clipboard!"));
            }
            
            if (GUILayout.Button("Open File", GUILayout.Height(30)))
            {
                OpenFile();
            }
            
            if (GUILayout.Button("Ignore", GUILayout.Height(30)))
            {
                Close();
            }
            
            EditorGUILayout.EndHorizontal();
        }
        
        private void ApplyFix()
        {
            if (string.IsNullOrEmpty(error.filePath) || !File.Exists(error.filePath))
            {
                EditorUtility.DisplayDialog("Error", "Cannot apply fix: File not found", "OK");
                return;
            }
            
            try
            {
                // Read current file
                string currentCode = File.ReadAllText(error.filePath);
                
                // Write suggested fix
                File.WriteAllText(error.filePath, suggestion.suggestedFix);
                
                // Refresh asset database
                AssetDatabase.Refresh();
                
                ShowNotification(new GUIContent("Fix applied! Recompiling..."));
                
                // Close window after short delay
                EditorApplication.delayCall += () =>
                {
                    System.Threading.Thread.Sleep(2000);
                    Close();
                };
            }
            catch (Exception e)
            {
                EditorUtility.DisplayDialog("Error", $"Failed to apply fix: {e.Message}", "OK");
            }
        }
        
        private void OpenFile()
        {
            if (string.IsNullOrEmpty(error.filePath))
            {
                return;
            }
            
            var script = AssetDatabase.LoadAssetAtPath<MonoScript>(error.filePath);
            if (script != null)
            {
                AssetDatabase.OpenAsset(script, error.lineNumber);
            }
        }
    }
}
