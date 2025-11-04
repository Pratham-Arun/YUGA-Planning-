#pragma once

#include <string>
#include <functional>
#include <memory>
#include <glm/glm.hpp>

namespace yuga::ui {

class Window;
class Panel;
class Widget;

class UISystem {
public:
    virtual ~UISystem() = default;

    // Initialization
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;

    // Frame control
    virtual void begin_frame() = 0;
    virtual void end_frame() = 0;

    // Window management
    virtual std::shared_ptr<Window> create_window(const std::string& title) = 0;
    virtual void destroy_window(Window* window) = 0;

    // Docking
    virtual void enable_docking(bool enabled) = 0;
    virtual void set_main_dock_space() = 0;

    // Style
    virtual void set_theme(const std::string& theme_name) = 0;
    virtual void set_font(const std::string& font_path, float size) = 0;

    // Debug tools
    virtual void show_demo_window() = 0;
    virtual void show_metrics_window() = 0;
    virtual void show_style_editor() = 0;

protected:
    UISystem() = default;
};

class Window {
public:
    virtual ~Window() = default;

    virtual void set_title(const std::string& title) = 0;
    virtual void set_size(const glm::vec2& size) = 0;
    virtual void set_position(const glm::vec2& pos) = 0;
    virtual void set_resizable(bool resizable) = 0;
    virtual void set_movable(bool movable) = 0;
    virtual void set_visible(bool visible) = 0;

    virtual bool begin() = 0;
    virtual void end() = 0;

    virtual void add_panel(std::shared_ptr<Panel> panel) = 0;
    virtual void remove_panel(Panel* panel) = 0;
};

class Panel {
public:
    virtual ~Panel() = default;

    virtual void set_title(const std::string& title) = 0;
    virtual void set_collapsed(bool collapsed) = 0;
    virtual void set_scroll_enabled(bool enabled) = 0;

    virtual bool begin() = 0;
    virtual void end() = 0;

    virtual void add_widget(std::shared_ptr<Widget> widget) = 0;
    virtual void remove_widget(Widget* widget) = 0;
};

class Widget {
public:
    virtual ~Widget() = default;

    virtual void render() = 0;
    virtual void set_enabled(bool enabled) = 0;
    virtual void set_tooltip(const std::string& text) = 0;
    virtual void set_style(const std::string& style_name) = 0;
};

} // namespace yuga::ui