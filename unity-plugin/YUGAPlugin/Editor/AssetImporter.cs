using UnityEngine;
using UnityEditor;
using System.IO;
using System.Threading.Tasks;
using UnityEngine.Networking;

namespace YUGA.Editor
{
    /// <summary>
    /// Handles importing AI-generated assets into Unity project
    /// </summary>
    public static class AssetImporter
    {
        private const string AI_GENERATED_PATH = "Assets/AI_Generated";
        private const string SCRIPTS_PATH = "Assets/AI_Generated/Scripts";
        private const string TEXTURES_PATH = "Assets/AI_Generated/Textures";
        private const string MODELS_PATH = "Assets/AI_Generated/Models";
        private const string AUDIO_PATH = "Assets/AI_Generated/Audio";
        
        /// <summary>
        /// Import generated C# script into project
        /// </summary>
        public static string ImportScript(string code, string filename)
        {
            try
            {
                EnsureDirectoryExists(SCRIPTS_PATH);
                
                // Ensure .cs extension
                if (!filename.EndsWith(".cs"))
                {
                    filename += ".cs";
                }
                
                // Get unique filename to avoid conflicts
                string fullPath = GetUniqueFilePath(SCRIPTS_PATH, filename);
                string assetPath = fullPath.Replace("\\", "/");
                
                // Write code to file
                File.WriteAllText(fullPath, code);
                
                // Refresh asset database
                AssetDatabase.Refresh();
                
                // Import the asset
                AssetDatabase.ImportAsset(assetPath);
                
                // Select the imported asset
                var script = AssetDatabase.LoadAssetAtPath<MonoScript>(assetPath);
                if (script != null)
                {
                    Selection.activeObject = script;
                    EditorGUIUtility.PingObject(script);
                }
                
                Debug.Log($"[YUGA] Script imported: {assetPath}");
                
                return assetPath;
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[YUGA] Failed to import script: {e.Message}");
                throw;
            }
        }
        
        /// <summary>
        /// Download and import texture from URL
        /// </summary>
        public static async Task<string> DownloadAndImportTexture(string url, string filename)
        {
            try
            {
                EnsureDirectoryExists(TEXTURES_PATH);
                
                // Ensure image extension
                if (!filename.EndsWith(".png") && !filename.EndsWith(".jpg"))
                {
                    filename += ".png";
                }
                
                string fullPath = GetUniqueFilePath(TEXTURES_PATH, filename);
                string assetPath = fullPath.Replace("\\", "/");
                
                // Download texture
                using (UnityWebRequest request = UnityWebRequestTexture.GetTexture(url))
                {
                    var operation = request.SendWebRequest();
                    
                    while (!operation.isDone)
                    {
                        await Task.Yield();
                    }
                    
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        var texture = DownloadHandlerTexture.GetContent(request);
                        var bytes = texture.EncodeToPNG();
                        File.WriteAllBytes(fullPath, bytes);
                        
                        AssetDatabase.Refresh();
                        AssetDatabase.ImportAsset(assetPath);
                        
                        // Configure texture import settings
                        TextureImporter importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
                        if (importer != null)
                        {
                            importer.textureType = TextureImporterType.Default;
                            importer.SaveAndReimport();
                        }
                        
                        var importedTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(assetPath);
                        if (importedTexture != null)
                        {
                            Selection.activeObject = importedTexture;
                            EditorGUIUtility.PingObject(importedTexture);
                        }
                        
                        Debug.Log($"[YUGA] Texture imported: {assetPath}");
                        return assetPath;
                    }
                    else
                    {
                        throw new System.Exception($"Download failed: {request.error}");
                    }
                }
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[YUGA] Failed to import texture: {e.Message}");
                throw;
            }
        }
        
        /// <summary>
        /// Download and import 3D model from URL
        /// </summary>
        public static async Task<string> DownloadAndImport3DModel(string url, string filename)
        {
            try
            {
                EnsureDirectoryExists(MODELS_PATH);
                
                // Ensure model extension
                if (!filename.EndsWith(".glb") && !filename.EndsWith(".fbx"))
                {
                    filename += ".glb";
                }
                
                string fullPath = GetUniqueFilePath(MODELS_PATH, filename);
                string assetPath = fullPath.Replace("\\", "/");
                
                // Download model
                using (UnityWebRequest request = UnityWebRequest.Get(url))
                {
                    var operation = request.SendWebRequest();
                    
                    while (!operation.isDone)
                    {
                        await Task.Yield();
                    }
                    
                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        File.WriteAllBytes(fullPath, request.downloadHandler.data);
                        
                        AssetDatabase.Refresh();
                        AssetDatabase.ImportAsset(assetPath);
                        
                        // Configure model import settings
                        ModelImporter importer = AssetImporter.GetAtPath(assetPath) as ModelImporter;
                        if (importer != null)
                        {
                            importer.globalScale = 1.0f;
                            importer.SaveAndReimport();
                        }
                        
                        var importedModel = AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
                        if (importedModel != null)
                        {
                            Selection.activeObject = importedModel;
                            EditorGUIUtility.PingObject(importedModel);
                        }
                        
                        Debug.Log($"[YUGA] Model imported: {assetPath}");
                        return assetPath;
                    }
                    else
                    {
                        throw new System.Exception($"Download failed: {request.error}");
                    }
                }
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[YUGA] Failed to import model: {e.Message}");
                throw;
            }
        }
        
        /// <summary>
        /// Ensure directory exists, create if not
        /// </summary>
        private static void EnsureDirectoryExists(string path)
        {
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
                AssetDatabase.Refresh();
            }
        }
        
        /// <summary>
        /// Get unique file path by appending number if file exists
        /// </summary>
        private static string GetUniqueFilePath(string directory, string filename)
        {
            string basePath = Path.Combine(directory, filename);
            
            if (!File.Exists(basePath))
            {
                return basePath;
            }
            
            // File exists, append number
            string nameWithoutExt = Path.GetFileNameWithoutExtension(filename);
            string extension = Path.GetExtension(filename);
            int counter = 1;
            
            while (true)
            {
                string newFilename = $"{nameWithoutExt}_{counter}{extension}";
                string newPath = Path.Combine(directory, newFilename);
                
                if (!File.Exists(newPath))
                {
                    return newPath;
                }
                
                counter++;
            }
        }
        
        /// <summary>
        /// Validate file size before import
        /// </summary>
        public static bool ValidateFileSize(long bytes, long maxSizeMB = 10)
        {
            long maxBytes = maxSizeMB * 1024 * 1024;
            
            if (bytes > maxBytes)
            {
                Debug.LogWarning($"[YUGA] File size ({bytes / 1024 / 1024}MB) exceeds limit ({maxSizeMB}MB)");
                return false;
            }
            
            return true;
        }
        
        /// <summary>
        /// Batch import multiple scripts
        /// </summary>
        public static string[] ImportScripts(string[] codes, string[] filenames)
        {
            if (codes.Length != filenames.Length)
            {
                throw new System.ArgumentException("Codes and filenames arrays must have same length");
            }
            
            AssetDatabase.StartAssetEditing();
            
            try
            {
                string[] assetPaths = new string[codes.Length];
                
                for (int i = 0; i < codes.Length; i++)
                {
                    assetPaths[i] = ImportScript(codes[i], filenames[i]);
                }
                
                return assetPaths;
            }
            finally
            {
                AssetDatabase.StopAssetEditing();
                AssetDatabase.Refresh();
            }
        }
    }
}
