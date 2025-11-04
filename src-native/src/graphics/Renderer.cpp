#include "yuga/graphics/Renderer.hpp"
#include "yuga/core/Window.hpp"
#include "yuga/graphics/RenderDevice.hpp"
#include "yuga/graphics/RenderContext.hpp"
#include "yuga/graphics/CommandBuffer.hpp"

namespace yuga {
namespace graphics {

Renderer::Renderer()
    : m_window(nullptr)
    , m_frameIndex(0)
    , m_frameCount(2)
    , m_vsync(true)
{
}

Renderer::~Renderer() {
    shutdown();
}

bool Renderer::initialize(Window* window) {
    m_window = window;

    // Initialize graphics device (OpenGL/Vulkan)
    if (!initializeDevice()) {
        return false;
    }

    // Create swapchain for window
    if (!createSwapchain()) {
        return false;
    }

    // Create default render pass
    if (!createDefaultRenderPass()) {
        return false;
    }

    // Create command buffers for each frame
    m_commandBuffers.resize(m_frameCount);
    for (auto& cmd : m_commandBuffers) {
        cmd = std::make_unique<CommandBuffer>();
        if (!cmd->initialize(m_device.get())) {
            return false;
        }
    }

    return true;
}

void Renderer::shutdown() {
    if (m_device) {
        m_device->waitIdle();
    }

    m_commandBuffers.clear();
    m_defaultRenderPass.reset();
    destroySwapchain();
    m_context.reset();
    m_device.reset();
}

void Renderer::beginFrame() {
    // Get next frame's command buffer
    m_currentCmd = m_commandBuffers[m_frameIndex].get();
    m_currentCmd->begin();

    // Begin default render pass
    m_currentCmd->beginRenderPass(m_defaultRenderPass.get());
}

void Renderer::endFrame() {
    // End render pass and command buffer
    m_currentCmd->endRenderPass();
    m_currentCmd->end();

    // Submit and present
    m_context->submit(m_currentCmd.get());
    m_context->present();

    // Advance to next frame
    m_frameIndex = (m_frameIndex + 1) % m_frameCount;
}

std::shared_ptr<Shader> Renderer::createShader(const std::string& vertexSource, const std::string& fragmentSource) {
    auto shader = std::make_shared<Shader>();
    if (!shader->initialize(m_device.get(), vertexSource, fragmentSource)) {
        return nullptr;
    }
    return shader;
}

std::shared_ptr<Pipeline> Renderer::createPipeline(const PipelineDesc& desc) {
    auto pipeline = std::make_shared<Pipeline>();
    if (!pipeline->initialize(m_device.get(), desc)) {
        return nullptr;
    }
    return pipeline;
}

std::shared_ptr<Buffer> Renderer::createBuffer(const BufferDesc& desc) {
    auto buffer = std::make_shared<Buffer>();
    if (!buffer->initialize(m_device.get(), desc)) {
        return nullptr;
    }
    return buffer;
}

std::shared_ptr<Texture> Renderer::createTexture(const TextureDesc& desc) {
    auto texture = std::make_shared<Texture>();
    if (!texture->initialize(m_device.get(), desc)) {
        return nullptr;
    }
    return texture;
}

void Renderer::setViewport(int x, int y, int width, int height) {
    m_currentCmd->setViewport(x, y, width, height);
}

void Renderer::setScissor(int x, int y, int width, int height) {
    m_currentCmd->setScissor(x, y, width, height);
}

void Renderer::clear(float r, float g, float b, float a) {
    m_currentCmd->clear(r, g, b, a);
}

void Renderer::bindPipeline(Pipeline* pipeline) {
    m_currentCmd->bindPipeline(pipeline);
}

void Renderer::bindVertexBuffer(Buffer* buffer, uint32_t binding) {
    m_currentCmd->bindVertexBuffer(buffer, binding);
}

void Renderer::bindIndexBuffer(Buffer* buffer) {
    m_currentCmd->bindIndexBuffer(buffer);
}

void Renderer::draw(uint32_t vertexCount, uint32_t firstVertex) {
    m_currentCmd->draw(vertexCount, firstVertex);
}

void Renderer::drawIndexed(uint32_t indexCount, uint32_t firstIndex) {
    m_currentCmd->drawIndexed(indexCount, firstIndex);
}

bool Renderer::initializeDevice() {
    // Choose graphics API (OpenGL/Vulkan)
    #if defined(YUGA_USE_VULKAN)
        m_device = std::make_unique<VulkanDevice>();
    #else
        m_device = std::make_unique<OpenGLDevice>();
    #endif

    if (!m_device->initialize()) {
        return false;
    }

    m_context = std::make_unique<RenderContext>();
    return m_context->initialize(m_device.get(), m_window);
}

bool Renderer::createSwapchain() {
    return m_context->createSwapchain(m_window->getWidth(), m_window->getHeight(), m_vsync);
}

bool Renderer::createDefaultRenderPass() {
    RenderPassDesc desc;
    desc.colorFormats = { m_context->getSwapchainFormat() };
    desc.depthFormat = Format::D24S8;

    m_defaultRenderPass = std::make_unique<RenderPass>();
    return m_defaultRenderPass->initialize(m_device.get(), desc);
}

void Renderer::destroySwapchain() {
    if (m_context) {
        m_context->destroySwapchain();
    }
}

} // namespace graphics
} // namespace yuga