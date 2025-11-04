#include "yuga/core/Application.hpp"
#include <GLFW/glfw3.h>
#include <iostream>

namespace yuga {
namespace core {

Application* Application::s_instance = nullptr;

Application::Application(const std::string& name)
    : m_name(name)
    , m_running(false)
    , m_lastFrameTime(0.0f)
{
    if (s_instance) {
        std::cerr << "Application already exists!" << std::endl;
        return;
    }
    s_instance = this;
}

Application::~Application() {
    if (s_instance == this) {
        s_instance = nullptr;
    }
}

bool Application::initialize() {
    m_window = std::make_unique<Window>();
    if (!m_window->initialize(m_name, 1280, 720)) {
        return false;
    }

    m_input = std::make_unique<InputManager>(m_window.get());
    if (!m_input->initialize()) {
        return false;
    }

    m_window->setEventCallback([this](Event& e) { onEvent(e); });

    m_lastFrameTime = static_cast<float>(glfwGetTime());
    m_running = true;

    return onInit();
}

void Application::shutdown() {
    onShutdown();

    if (m_input) {
        m_input->shutdown();
        m_input.reset();
    }

    if (m_window) {
        m_window->shutdown();
        m_window.reset();
    }
}

void Application::run() {
    while (m_running) {
        float currentTime = static_cast<float>(glfwGetTime());
        float deltaTime = currentTime - m_lastFrameTime;
        m_lastFrameTime = currentTime;

        if (!m_window->isMinimized()) {
            m_input->processEvents();
            m_input->update(deltaTime);

            onUpdate(deltaTime);
            onRender();

            glfwSwapBuffers(m_window->getNativeWindow());
        }

        if (m_window->shouldClose()) {
            m_running = false;
        }
    }
}

void Application::onEvent(Event& event) {
    switch (event.type) {
    case EventType::WindowClose:
        m_running = false;
        break;
    default:
        break;
    }
}

} // namespace core
} // namespace yuga