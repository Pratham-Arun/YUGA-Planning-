#include "yuga/core/Engine.hpp"
#include "yuga/core/Window.hpp"
#include "yuga/graphics/Renderer.hpp"
#include "yuga/scene/SceneManager.hpp"
#include "yuga/resource/ResourceManager.hpp"
#include "yuga/input/InputManager.hpp"
#include "yuga/audio/AudioManager.hpp"
#include "yuga/physics/PhysicsSystem.hpp"
#include "yuga/ecs/EntityComponentSystem.hpp"

#include <chrono>

namespace yuga {
namespace core {

Engine::Engine()
    : m_isRunning(false)
    , m_timeStep(1.0f / 60.0f)  // 60 FPS fixed timestep
    , m_accumulatedTime(0.0f)
{
}

Engine::~Engine() {
    shutdown();
}

bool Engine::initialize(const std::string& appName, int width, int height) {
    // Initialize in reverse order of dependencies
    
    // 1. Window and Input (platform layer)
    m_window = std::make_unique<Window>();
    if (!m_window->initialize(appName, width, height)) {
        return false;
    }

    m_inputManager = std::make_unique<InputManager>(m_window.get());
    if (!m_inputManager->initialize()) {
        return false;
    }

    // 2. Graphics system
    m_renderer = std::make_unique<Renderer>();
    if (!m_renderer->initialize(m_window.get())) {
        return false;
    }

    // 3. Resource management
    m_resourceManager = std::make_unique<ResourceManager>();
    if (!m_resourceManager->initialize()) {
        return false;
    }

    // 4. Core systems
    m_audioManager = std::make_unique<AudioManager>();
    if (!m_audioManager->initialize()) {
        return false;
    }

    m_physicsSystem = std::make_unique<PhysicsSystem>();
    if (!m_physicsSystem->initialize()) {
        return false;
    }

    // 5. Entity-Component System
    m_ecs = std::make_unique<EntityComponentSystem>();
    if (!m_ecs->initialize()) {
        return false;
    }

    // 6. Scene Management (depends on ECS)
    m_sceneManager = std::make_unique<SceneManager>(this);
    if (!m_sceneManager->initialize()) {
        return false;
    }

    m_isRunning = true;
    return true;
}

void Engine::run() {
    using clock = std::chrono::high_resolution_clock;
    using duration = std::chrono::duration<float>;

    auto lastTime = clock::now();

    while (m_isRunning) {
        auto currentTime = clock::now();
        float frameTime = std::chrono::duration_cast<duration>(currentTime - lastTime).count();
        lastTime = currentTime;

        // Cap maximum frame time to avoid spiral of death
        if (frameTime > 0.25f) {
            frameTime = 0.25f;
        }

        m_accumulatedTime += frameTime;

        // Fixed timestep update
        while (m_accumulatedTime >= m_timeStep) {
            update(m_timeStep);
            m_accumulatedTime -= m_timeStep;
        }

        // Render at display refresh rate
        render();

        // Process window events and check if we should continue
        m_isRunning = processFrame();
    }
}

void Engine::shutdown() {
    // Shutdown in reverse order of initialization
    if (m_sceneManager) m_sceneManager->shutdown();
    if (m_ecs) m_ecs->shutdown();
    if (m_physicsSystem) m_physicsSystem->shutdown();
    if (m_audioManager) m_audioManager->shutdown();
    if (m_resourceManager) m_resourceManager->shutdown();
    if (m_renderer) m_renderer->shutdown();
    if (m_inputManager) m_inputManager->shutdown();
    if (m_window) m_window->shutdown();
}

bool Engine::processFrame() {
    m_inputManager->processEvents();
    return !m_window->shouldClose();
}

void Engine::update(float deltaTime) {
    // Update subsystems in dependency order
    m_inputManager->update(deltaTime);
    m_physicsSystem->update(deltaTime);
    m_ecs->update(deltaTime);
    m_sceneManager->update(deltaTime);
    m_audioManager->update(deltaTime);
}

void Engine::render() {
    m_renderer->beginFrame();
    m_sceneManager->render();
    m_renderer->endFrame();
}

} // namespace core
} // namespace yuga