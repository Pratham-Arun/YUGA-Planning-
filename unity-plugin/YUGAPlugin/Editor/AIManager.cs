using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Text;
using System.Threading.Tasks;

namespace YUGA.Editor
{
    /// <summary>
    /// HTTP client manager for communicating with YUGA backend API
    /// </summary>
    public static class AIManager
    {
        private const int DEFAULT_TIMEOUT = 30;
        private const int MAX_RETRIES = 3;
        
        /// <summary>
        /// Generate code from natural language prompt
        /// </summary>
        public static async Task<CodeGenerationResponse> GenerateCode(string prompt, string model, string language)
        {
            var settings = YUGASettings.Instance;
            var url = $"{settings.apiEndpoint}/api/ai/generate-code";
            
            var request = new CodeGenerationRequest
            {
                prompt = prompt,
                model = model,
                language = language
            };
            
            var response = await PostRequest<CodeGenerationRequest, CodeGenerationResponse>(url, request);
            return response;
        }
        
        /// <summary>
        /// Generate asset (texture, 3D model, etc.)
        /// </summary>
        public static async Task<AssetGenerationResponse> GenerateAsset(string prompt, string type)
        {
            var settings = YUGASettings.Instance;
            var url = $"{settings.apiEndpoint}/api/ai/generate-asset";
            
            var request = new AssetGenerationRequest
            {
                prompt = prompt,
                type = type
            };
            
            var response = await PostRequest<AssetGenerationRequest, AssetGenerationResponse>(url, request);
            return response;
        }
        
        /// <summary>
        /// Debug error and get AI-powered fix suggestion
        /// </summary>
        public static async Task<DebugResponse> DebugError(string error, string stackTrace, string codeContext, string language, string model)
        {
            var settings = YUGASettings.Instance;
            var url = $"{settings.apiEndpoint}/api/ai/debug";
            
            var request = new DebugRequest
            {
                error = error,
                stackTrace = stackTrace,
                codeContext = codeContext,
                language = language,
                model = model
            };
            
            var response = await PostRequest<DebugRequest, DebugResponse>(url, request);
            return response;
        }
        
        /// <summary>
        /// Test connection to backend server
        /// </summary>
        public static async Task<bool> TestConnection()
        {
            try
            {
                var settings = YUGASettings.Instance;
                var url = $"{settings.apiEndpoint}/health";
                
                using (UnityWebRequest request = UnityWebRequest.Get(url))
                {
                    request.timeout = 5;
                    var operation = request.SendWebRequest();
                    
                    while (!operation.isDone)
                    {
                        await Task.Yield();
                    }
                    
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        var response = request.downloadHandler.text;
                        return response.Contains("\"ok\":true");
                    }
                    
                    return false;
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"Connection test failed: {e.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Generic POST request handler with retry logic
        /// </summary>
        private static async Task<TResponse> PostRequest<TRequest, TResponse>(string url, TRequest requestData)
        {
            var settings = YUGASettings.Instance;
            int retries = 0;
            
            while (retries < (settings.maxRetries > 0 ? settings.maxRetries : MAX_RETRIES))
            {
                try
                {
                    var json = JsonUtility.ToJson(requestData);
                    var bodyRaw = Encoding.UTF8.GetBytes(json);
                    
                    using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
                    {
                        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                        request.downloadHandler = new DownloadHandlerBuffer();
                        request.SetRequestHeader("Content-Type", "application/json");
                        request.timeout = settings.requestTimeout > 0 ? settings.requestTimeout : DEFAULT_TIMEOUT;
                        
                        if (settings.debugMode)
                        {
                            Debug.Log($"[YUGA] POST {url}\nRequest: {json}");
                        }
                        
                        var operation = request.SendWebRequest();
                        
                        while (!operation.isDone)
                        {
                            await Task.Yield();
                        }
                        
                        if (request.result == UnityWebRequest.Result.Success)
                        {
                            var responseText = request.downloadHandler.text;
                            
                            if (settings.debugMode)
                            {
                                Debug.Log($"[YUGA] Response: {responseText}");
                            }
                            
                            var response = JsonUtility.FromJson<TResponse>(responseText);
                            return response;
                        }
                        else
                        {
                            var errorText = request.downloadHandler.text;
                            throw new Exception($"HTTP {request.responseCode}: {errorText}");
                        }
                    }
                }
                catch (Exception e)
                {
                    retries++;
                    
                    if (retries >= (settings.maxRetries > 0 ? settings.maxRetries : MAX_RETRIES))
                    {
                        Debug.LogError($"[YUGA] Request failed after {retries} retries: {e.Message}");
                        throw;
                    }
                    
                    // Exponential backoff
                    await Task.Delay(1000 * retries);
                }
            }
            
            throw new Exception("Request failed");
        }
    }
    
    // Request/Response Data Classes
    
    [Serializable]
    public class CodeGenerationRequest
    {
        public string prompt;
        public string model;
        public string language;
    }
    
    [Serializable]
    public class CodeGenerationResponse
    {
        public string code;
        public string model;
    }
    
    [Serializable]
    public class AssetGenerationRequest
    {
        public string prompt;
        public string type;
    }
    
    [Serializable]
    public class AssetGenerationResponse
    {
        public string message;
        public string url;
        public string assetPath;
    }
    
    [Serializable]
    public class DebugRequest
    {
        public string error;
        public string stackTrace;
        public string codeContext;
        public string language;
        public string model;
    }
    
    [Serializable]
    public class DebugResponse
    {
        public string explanation;
        public string suggestedFix;
        public string fixType;
        public float confidence;
    }
}
