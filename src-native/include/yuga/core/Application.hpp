#pragma once

#include "yuga/core/Window.hpp"
#include <memory>
#include <string>

namespace yuga {
namespace core {

class Application {
public:
    Application(const std::string& name = "YUGA Engine");
    virtual ~Application();

    bool initialize();
    void shutdown();
    void run();

    inline Window& getWindow() { return *m_window; }
    inline InputManager& getInput() { return *m_input; }
    inline bool isRunning() const { return m_running; }
    inline void stop() { m_running = false; }

    static Application& get() { return *s_instance; }

protected:
    virtual bool onInit() { return true; }
    virtual void onShutdown() {}
    virtual void onUpdate(float deltaTime) {}
    virtual void onRender() {}
    virtual void onEvent(Event& event);

private:
    std::unique_ptr<Window> m_window;
    std::unique_ptr<InputManager> m_input;
    std::string m_name;
    bool m_running;
    float m_lastFrameTime;

    static Application* s_instance;
};

} // namespace core
} // namespace yuga