#pragma once

#include <string>
#include <vector>
#include <glm/glm.hpp>

namespace yuga::graphics {

// Forward declarations
class Shader;
class Texture;
class Mesh;
class Material;

enum class GraphicsAPI {
    OpenGL,
    Vulkan
};

class Renderer {
public:
    virtual ~Renderer() = default;

    // Initialization
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;

    // Frame control
    virtual void begin_frame() = 0;
    virtual void end_frame() = 0;
    
    // Resource management
    virtual std::shared_ptr<Shader> create_shader(const std::string& vert_path, const std::string& frag_path) = 0;
    virtual std::shared_ptr<Texture> create_texture(const std::string& path) = 0;
    virtual std::shared_ptr<Mesh> create_mesh(const std::vector<float>& vertices, const std::vector<unsigned int>& indices) = 0;
    
    // Rendering
    virtual void set_viewport(int x, int y, int width, int height) = 0;
    virtual void clear(const glm::vec4& color = glm::vec4(0.0f)) = 0;
    virtual void draw_mesh(const Mesh* mesh, const Material* material, const glm::mat4& transform) = 0;
    
    // Debug
    virtual void begin_debug_region(const char* name) = 0;
    virtual void end_debug_region() = 0;

    // Settings
    virtual void set_vsync(bool enabled) = 0;
    virtual void set_msaa_samples(int samples) = 0;

    // Info
    virtual GraphicsAPI get_api() const = 0;
    virtual const char* get_gpu_name() const = 0;
    virtual const char* get_api_version() const = 0;

protected:
    Renderer() = default;
};

} // namespace yuga::graphics