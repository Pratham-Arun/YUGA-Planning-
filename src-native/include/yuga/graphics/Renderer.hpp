#pragma once

#include <memory>
#include <vector>

namespace yuga {
namespace graphics {

class Window;
class RenderDevice;
class RenderContext;
class RenderPass;
class CommandBuffer;
class Shader;
class Pipeline;
class Buffer;

/**
 * @brief Main rendering system for the engine
 * 
 * The Renderer class manages graphics device initialization,
 * render passes, resource management, and frame rendering.
 * Supports both OpenGL and Vulkan backends.
 */
class Renderer {
public:
    Renderer();
    ~Renderer();

    bool initialize(Window* window);
    void shutdown();

    void beginFrame();
    void endFrame();

    // Resource management
    std::shared_ptr<Shader> createShader(const std::string& vertexSource, const std::string& fragmentSource);
    std::shared_ptr<Pipeline> createPipeline(const PipelineDesc& desc);
    std::shared_ptr<Buffer> createBuffer(const BufferDesc& desc);
    std::shared_ptr<Texture> createTexture(const TextureDesc& desc);

    // Immediate rendering commands
    void setViewport(int x, int y, int width, int height);
    void setScissor(int x, int y, int width, int height);
    void clear(float r, float g, float b, float a);
    void bindPipeline(Pipeline* pipeline);
    void bindVertexBuffer(Buffer* buffer, uint32_t binding);
    void bindIndexBuffer(Buffer* buffer);
    void draw(uint32_t vertexCount, uint32_t firstVertex);
    void drawIndexed(uint32_t indexCount, uint32_t firstIndex);

    // Access to low-level graphics API
    RenderDevice* getDevice() const { return m_device.get(); }
    RenderContext* getContext() const { return m_context.get(); }
    CommandBuffer* getCurrentCommandBuffer() const { return m_currentCmd.get(); }

private:
    bool initializeDevice();
    bool createSwapchain();
    bool createDefaultRenderPass();
    void destroySwapchain();

    std::unique_ptr<RenderDevice> m_device;
    std::unique_ptr<RenderContext> m_context;
    std::unique_ptr<RenderPass> m_defaultRenderPass;
    std::vector<std::unique_ptr<CommandBuffer>> m_commandBuffers;
    std::unique_ptr<CommandBuffer> m_currentCmd;

    Window* m_window;
    uint32_t m_frameIndex;
    uint32_t m_frameCount;
    bool m_vsync;
};