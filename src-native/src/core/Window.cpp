#include "yuga/core/Window.hpp"
#include <GLFW/glfw3.h>
#include <iostream>

namespace yuga {
namespace core {

Window::Window()
    : m_window(nullptr)
    , m_width(0)
    , m_height(0)
    , m_vsync(true)
    , m_minimized(false)
    , m_focused(true)
{
}

Window::~Window() {
    shutdown();
}

bool Window::initialize(const std::string& title, int width, int height) {
    if (!glfwInit()) {
        std::cerr << "Failed to initialize GLFW" << std::endl;
        return false;
    }

    m_title = title;
    m_width = width;
    m_height = height;

    // Configure GLFW
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 5);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    #ifdef __APPLE__
        glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE);
    #endif

    // Create window
    m_window = glfwCreateWindow(width, height, title.c_str(), nullptr, nullptr);
    if (!m_window) {
        std::cerr << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return false;
    }

    glfwMakeContextCurrent(m_window);
    setVSync(true);

    // Store window pointer for callbacks
    glfwSetWindowUserPointer(m_window, this);

    setupCallbacks();
    return true;
}

void Window::shutdown() {
    if (m_window) {
        glfwDestroyWindow(m_window);
        m_window = nullptr;
    }
    glfwTerminate();
}

void Window::pollEvents() {
    glfwPollEvents();
}

bool Window::shouldClose() const {
    return glfwWindowShouldClose(m_window);
}

void Window::setVSync(bool enabled) {
    glfwSwapInterval(enabled ? 1 : 0);
    m_vsync = enabled;
}

math::Vec2 Window::getMousePosition() const {
    double x, y;
    glfwGetCursorPos(m_window, &x, &y);
    return math::Vec2(static_cast<float>(x), static_cast<float>(y));
}

void Window::setMousePosition(const math::Vec2& pos) {
    glfwSetCursorPos(m_window, pos.x, pos.y);
}

void Window::setMouseCursor(bool enabled) {
    glfwSetInputMode(m_window, GLFW_CURSOR, 
        enabled ? GLFW_CURSOR_NORMAL : GLFW_CURSOR_DISABLED);
}

void Window::setupCallbacks() {
    glfwSetWindowSizeCallback(m_window, windowResizeCallback);
    glfwSetWindowFocusCallback(m_window, windowFocusCallback);
    glfwSetKeyCallback(m_window, keyCallback);
    glfwSetMouseButtonCallback(m_window, mouseButtonCallback);
    glfwSetCursorPosCallback(m_window, mouseMoveCallback);
    glfwSetScrollCallback(m_window, mouseScrollCallback);
}

void Window::windowResizeCallback(GLFWwindow* window, int width, int height) {
    auto& self = *static_cast<Window*>(glfwGetWindowUserPointer(window));
    self.m_width = width;
    self.m_height = height;
    self.m_minimized = (width == 0 || height == 0);

    Event event;
    event.type = EventType::WindowResize;
    event.window.width = width;
    event.window.height = height;
    self.m_eventCallback(event);
}

void Window::windowFocusCallback(GLFWwindow* window, int focused) {
    auto& self = *static_cast<Window*>(glfwGetWindowUserPointer(window));
    self.m_focused = focused;

    Event event;
    event.type = focused ? EventType::WindowFocus : EventType::WindowLostFocus;
    self.m_eventCallback(event);
}

void Window::keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods) {
    auto& self = *static_cast<Window*>(glfwGetWindowUserPointer(window));

    Event event;
    switch (action) {
        case GLFW_PRESS:   event.type = EventType::KeyPress; break;
        case GLFW_RELEASE: event.type = EventType::KeyRelease; break;
        case GLFW_REPEAT:  event.type = EventType::KeyRepeat; break;
    }

    event.key.key = static_cast<KeyCode>(key);
    event.key.scancode = scancode;
    event.key.shift = (mods & GLFW_MOD_SHIFT) != 0;
    event.key.control = (mods & GLFW_MOD_CONTROL) != 0;
    event.key.alt = (mods & GLFW_MOD_ALT) != 0;
    event.key.super = (mods & GLFW_MOD_SUPER) != 0;

    self.m_eventCallback(event);
}

void Window::mouseButtonCallback(GLFWwindow* window, int button, int action, int mods) {
    auto& self = *static_cast<Window*>(glfwGetWindowUserPointer(window));

    Event event;
    event.type = (action == GLFW_PRESS) ? 
        EventType::MouseButtonPress : EventType::MouseButtonRelease;

    event.mouseButton.button = static_cast<MouseButton>(button);
    event.mouseButton.shift = (mods & GLFW_MOD_SHIFT) != 0;
    event.mouseButton.control = (mods & GLFW_MOD_CONTROL) != 0;
    event.mouseButton.alt = (mods & GLFW_MOD_ALT) != 0;
    event.mouseButton.super = (mods & GLFW_MOD_SUPER) != 0;

    self.m_eventCallback(event);
}

void Window::mouseMoveCallback(GLFWwindow* window, double x, double y) {
    auto& self = *static_cast<Window*>(glfwGetWindowUserPointer(window));

    Event event;
    event.type = EventType::MouseMove;
    event.mouseMove.x = x;
    event.mouseMove.y = y;

    self.m_eventCallback(event);
}

void Window::mouseScrollCallback(GLFWwindow* window, double x, double y) {
    auto& self = *static_cast<Window*>(glfwGetWindowUserPointer(window));

    Event event;
    event.type = EventType::MouseScroll;
    event.mouseScroll.x = x;
    event.mouseScroll.y = y;

    self.m_eventCallback(event);
}

// InputManager implementation

InputManager::InputManager(Window* window)
    : m_window(window)
    , m_keyStates(static_cast<size_t>(KeyCode::Last), false)
    , m_mouseButtonStates(static_cast<size_t>(MouseButton::Last) + 1, false)
    , m_mousePos(0, 0)
    , m_lastMousePos(0, 0)
    , m_mouseDelta(0, 0)
    , m_mouseScroll(0, 0)
    , m_firstMouse(true)
{
}

InputManager::~InputManager() {
    shutdown();
}

bool InputManager::initialize() {
    m_window->setEventCallback([this](Event& event) { onEvent(event); });
    return true;
}

void InputManager::shutdown() {
}

void InputManager::processEvents() {
    m_window->pollEvents();
}

void InputManager::update(float deltaTime) {
    // Reset per-frame state
    m_mouseDelta = math::Vec2(0, 0);
    m_mouseScroll = math::Vec2(0, 0);
}

bool InputManager::isKeyPressed(KeyCode key) const {
    return m_keyStates[static_cast<size_t>(key)];
}

bool InputManager::isMouseButtonPressed(MouseButton button) const {
    return m_mouseButtonStates[static_cast<size_t>(button)];
}

math::Vec2 InputManager::getMousePosition() const {
    return m_mousePos;
}

math::Vec2 InputManager::getMouseDelta() const {
    return m_mouseDelta;
}

math::Vec2 InputManager::getMouseScroll() const {
    return m_mouseScroll;
}

void InputManager::setMouseCursor(bool enabled) {
    m_window->setMouseCursor(enabled);
}

void InputManager::setMousePosition(const math::Vec2& pos) {
    m_window->setMousePosition(pos);
    m_mousePos = pos;
    m_lastMousePos = pos;
}

void InputManager::onEvent(Event& event) {
    switch (event.type) {
        case EventType::KeyPress:
            m_keyStates[static_cast<size_t>(event.key.key)] = true;
            break;

        case EventType::KeyRelease:
            m_keyStates[static_cast<size_t>(event.key.key)] = false;
            break;

        case EventType::MouseButtonPress:
            m_mouseButtonStates[static_cast<size_t>(event.mouseButton.button)] = true;
            break;

        case EventType::MouseButtonRelease:
            m_mouseButtonStates[static_cast<size_t>(event.mouseButton.button)] = false;
            break;

        case EventType::MouseMove:
            m_mousePos = math::Vec2(event.mouseMove.x, event.mouseMove.y);
            if (m_firstMouse) {
                m_lastMousePos = m_mousePos;
                m_firstMouse = false;
            }
            m_mouseDelta = m_mousePos - m_lastMousePos;
            m_lastMousePos = m_mousePos;
            break;

        case EventType::MouseScroll:
            m_mouseScroll = math::Vec2(event.mouseScroll.x, event.mouseScroll.y);
            break;

        default:
            break;
    }
}

} // namespace core
} // namespace yuga