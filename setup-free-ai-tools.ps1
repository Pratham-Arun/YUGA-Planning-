# YUGA Free AI Tools Setup Script
# Installs Ollama, Whisper, Coqui TTS, and optionally Stable Diffusion

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🆓 YUGA FREE AI TOOLS INSTALLER 🆓        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check Python
Write-Host "🔍 Checking Python..." -ForegroundColor Yellow
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found. Please install Python 3.8+" -ForegroundColor Red
    Write-Host "   Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}
$pythonVersion = python --version
Write-Host "✅ Found: $pythonVersion" -ForegroundColor Green

# Install Ollama
Write-Host "`n📦 Installing Ollama..." -ForegroundColor Yellow
if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "   Opening Ollama download page..." -ForegroundColor Yellow
    Start-Process "https://ollama.ai/download"
    Write-Host "   Please install Ollama and press Enter to continue..." -ForegroundColor Yellow
    Read-Host
} else {
    Write-Host "✅ Ollama already installed" -ForegroundColor Green
}

# Install Whisper
Write-Host "`n📦 Installing OpenAI Whisper..." -ForegroundColor Yellow
pip install -q openai-whisper
Write-Host "✅ Whisper installed" -ForegroundColor Green

# Install Coqui TTS
Write-Host "`n📦 Installing Coqui TTS..." -ForegroundColor Yellow
pip install -q TTS
Write-Host "✅ Coqui TTS installed" -ForegroundColor Green

# Install Stable Diffusion WebUI (optional)
Write-Host "`n📦 Stable Diffusion WebUI (optional)..." -ForegroundColor Yellow
$installSD = Read-Host "Install Stable Diffusion WebUI? (y/n)"
if ($installSD -eq 'y') {
    if (Test-Path "stable-diffusion-webui") {
        Write-Host "✅ Already exists" -ForegroundColor Green
    } else {
        git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
        Write-Host "✅ Cloned. Run webui-user.bat --api to start" -ForegroundColor Green
    }
}

# Pull Ollama models
Write-Host "`n📦 Pulling Ollama models..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor Gray
ollama pull llama3.2
ollama pull mistral
Write-Host "✅ Models downloaded" -ForegroundColor Green

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✅ INSTALLATION COMPLETE! ✅            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start Ollama: ollama serve" -ForegroundColor White
Write-Host "   2. (Optional) Start SD: cd stable-diffusion-webui && .\webui-user.bat --api" -ForegroundColor White
Write-Host "   3. Restart YUGA backend: npm run api" -ForegroundColor White
Write-Host "   4. Test: curl http://localhost:4000/api/free-ai/status`n" -ForegroundColor White
