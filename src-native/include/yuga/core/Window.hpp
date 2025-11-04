#pragma once

#include "yuga/math/Math.hpp"
#include <string>
#include <vector>
#include <functional>

struct GLFWwindow;

namespace yuga {
namespace core {

/**
 * @brief Keyboard key codes
 */
enum class KeyCode {
    None = 0,
    Space = 32,
    Apostrophe = 39,
    Comma = 44,
    Minus = 45,
    Period = 46,
    Slash = 47,
    Key0 = 48,
    Key1 = 49,
    // ... Add other key codes
    Last = 348
};

/**
 * @brief Mouse button codes
 */
enum class MouseButton {
    Left = 0,
    Right = 1,
    Middle = 2,
    Button4 = 3,
    Button5 = 4,
    Last = Button5
};

/**
 * @brief Input event types
 */
enum class EventType {
    None = 0,
    WindowClose,
    WindowResize,
    WindowFocus,
    WindowLostFocus,
    KeyPress,
    KeyRelease,
    KeyRepeat,
    MouseButtonPress,
    MouseButtonRelease,
    MouseMove,
    MouseScroll
};

/**
 * @brief Input event data
 */
struct Event {
    EventType type;
    union {
        struct {
            int width;
            int height;
        } window;
        struct {
            KeyCode key;
            int scancode;
            bool shift;
            bool control;
            bool alt;
            bool super;
        } key;
        struct {
            MouseButton button;
            bool shift;
            bool control;
            bool alt;
            bool super;
        } mouseButton;
        struct {
            double x;
            double y;
        } mouseMove;
        struct {
            double x;
            double y;
        } mouseScroll;
    };
};

/**
 * @brief Window management and input handling
 */
class Window {
public:
    Window();
    ~Window();

    bool initialize(const std::string& title, int width, int height);
    void shutdown();

    void pollEvents();
    bool shouldClose() const;

    void setEventCallback(const std::function<void(Event&)>& callback) {
        m_eventCallback = callback;
    }

    GLFWwindow* getNativeWindow() const { return m_window; }
    int getWidth() const { return m_width; }
    int getHeight() const { return m_height; }
    bool isMinimized() const { return m_minimized; }
    bool isFocused() const { return m_focused; }

    void setVSync(bool enabled);
    bool isVSync() const { return m_vsync; }

    math::Vec2 getMousePosition() const;
    void setMousePosition(const math::Vec2& pos);
    void setMouseCursor(bool enabled);

private:
    void setupCallbacks();

    static void windowResizeCallback(GLFWwindow* window, int width, int height);
    static void windowFocusCallback(GLFWwindow* window, int focused);
    static void keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods);
    static void mouseButtonCallback(GLFWwindow* window, int button, int action, int mods);
    static void mouseMoveCallback(GLFWwindow* window, double x, double y);
    static void mouseScrollCallback(GLFWwindow* window, double x, double y);

    GLFWwindow* m_window;
    std::string m_title;
    int m_width;
    int m_height;
    bool m_vsync;
    bool m_minimized;
    bool m_focused;
    std::function<void(Event&)> m_eventCallback;
};

/**
 * @brief Input state management
 */
class InputManager {
public:
    InputManager(Window* window);
    ~InputManager();

    bool initialize();
    void shutdown();

    void processEvents();
    void update(float deltaTime);

    bool isKeyPressed(KeyCode key) const;
    bool isMouseButtonPressed(MouseButton button) const;
    math::Vec2 getMousePosition() const;
    math::Vec2 getMouseDelta() const;
    math::Vec2 getMouseScroll() const;

    void setMouseCursor(bool enabled);
    void setMousePosition(const math::Vec2& pos);

private:
    void onEvent(Event& event);

    Window* m_window;
    std::vector<bool> m_keyStates;
    std::vector<bool> m_mouseButtonStates;
    math::Vec2 m_mousePos;
    math::Vec2 m_lastMousePos;
    math::Vec2 m_mouseDelta;
    math::Vec2 m_mouseScroll;
    bool m_firstMouse;
};

} // namespace core
} // namespace yuga