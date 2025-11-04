#pragma once

#include <memory>
#include <string>
#include <vector>
#include "graphics/renderer.hpp"
#include "physics/physics_system.hpp"
#include "audio/audio_system.hpp"
#include "ui/ui_system.hpp"
#include "scripting/script_system.hpp"
#include "ai/ai_system.hpp"

namespace yuga {

class Engine {
public:
    struct Config {
        bool enable_vulkan = false;
        bool enable_ai = true;
        std::string asset_path;
        std::string script_path;
    };

    Engine(const Config& config = Config());
    ~Engine();

    // Core systems
    std::shared_ptr<graphics::Renderer> graphics;
    std::shared_ptr<physics::PhysicsSystem> physics;
    std::shared_ptr<audio::AudioSystem> audio;
    std::shared_ptr<ui::UISystem> ui;
    std::shared_ptr<scripting::ScriptSystem> scripting;
    std::shared_ptr<ai::AISystem> ai;

    // Lifecycle
    bool initialize();
    void update(float delta_time);
    void render();
    void shutdown();

    // Asset management
    bool load_asset(const std::string& path);
    void unload_asset(const std::string& path);

    // Scene management
    void load_scene(const std::string& path);
    void save_scene(const std::string& path);

private:
    Config config_;
    bool initialized_ = false;
    
    bool init_graphics();
    bool init_physics();
    bool init_audio();
    bool init_ui();
    bool init_scripting();
    bool init_ai();
};

} // namespace yuga