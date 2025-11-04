#pragma once

#include <memory>
#include <string>
#include <vector>

namespace yuga {
namespace core {

class Window;
class Renderer;
class SceneManager;
class ResourceManager;
class InputManager;
class AudioManager;
class PhysicsSystem;
class EntityComponentSystem;

/**
 * @brief Main engine class that coordinates all subsystems
 * 
 * The Engine class is the central coordinator for all major engine subsystems.
 * It handles initialization, update loop, and cleanup of:
 * - Window management and input
 * - Graphics/Rendering
 * - Scene graph
 * - Resource loading/management
 * - Physics simulation
 * - Audio playback
 * - Entity-Component System
 */
class Engine {
public:
    Engine();
    ~Engine();

    /**
     * @brief Initialize the engine and all subsystems
     * @param appName Name of the application
     * @param width Initial window width
     * @param height Initial window height
     * @return true if initialization succeeded
     */
    bool initialize(const std::string& appName, int width, int height);

    /**
     * @brief Run the main engine loop
     */
    void run();

    /**
     * @brief Shutdown the engine and cleanup resources
     */
    void shutdown();

    /**
     * @brief Get the main window instance
     */
    Window* getWindow() const { return m_window.get(); }

    /**
     * @brief Get the renderer instance
     */
    Renderer* getRenderer() const { return m_renderer.get(); }

    /**
     * @brief Get the scene manager
     */
    SceneManager* getSceneManager() const { return m_sceneManager.get(); }

    /**
     * @brief Get the resource manager
     */
    ResourceManager* getResourceManager() const { return m_resourceManager.get(); }

    /**
     * @brief Get the input manager
     */
    InputManager* getInputManager() const { return m_inputManager.get(); }

    /**
     * @brief Get the audio manager
     */
    AudioManager* getAudioManager() const { return m_audioManager.get(); }

    /**
     * @brief Get the physics system
     */
    PhysicsSystem* getPhysicsSystem() const { return m_physicsSystem.get(); }

    /**
     * @brief Get the entity component system
     */
    EntityComponentSystem* getECS() const { return m_ecs.get(); }

private:
    /**
     * @brief Process a single frame
     * @return true if the engine should continue running
     */
    bool processFrame();

    /**
     * @brief Update all subsystems
     * @param deltaTime Time elapsed since last frame in seconds
     */
    void update(float deltaTime);

    /**
     * @brief Render the current frame
     */
    void render();

    std::unique_ptr<Window> m_window;
    std::unique_ptr<Renderer> m_renderer;
    std::unique_ptr<SceneManager> m_sceneManager;
    std::unique_ptr<ResourceManager> m_resourceManager;
    std::unique_ptr<InputManager> m_inputManager;
    std::unique_ptr<AudioManager> m_audioManager;
    std::unique_ptr<PhysicsSystem> m_physicsSystem;
    std::unique_ptr<EntityComponentSystem> m_ecs;

    bool m_isRunning;
    float m_timeStep;
    float m_accumulatedTime;
};