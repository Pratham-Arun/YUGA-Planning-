#include "yuga/core/Application.hpp"
#include "yuga/core/Window.hpp"
#include <iostream>

class ExampleApp : public yuga::core::Application {
public:
    ExampleApp() : Application("YUGA Example") {}

protected:
    bool onInit() override {
        std::cout << "Example application initialized!" << std::endl;
        return true;
    }

    void onUpdate(float deltaTime) override {
        // Check for escape key to exit
        if (getInput().isKeyPressed(yuga::core::KeyCode::Escape)) {
            stop();
        }

        // Print mouse position when left button is clicked
        if (getInput().isMouseButtonPressed(yuga::core::MouseButton::Left)) {
            auto mousePos = getInput().getMousePosition();
            std::cout << "Mouse clicked at: (" << mousePos.x << ", " << mousePos.y << ")" << std::endl;
        }
    }

    void onRender() override {
        // Clear the screen (we'll add proper rendering later)
        glClear(GL_COLOR_BUFFER_BIT);
    }

    void onEvent(yuga::core::Event& event) override {
        Application::onEvent(event); // Call base class event handler

        switch (event.type) {
        case yuga::core::EventType::WindowResize:
            std::cout << "Window resized to: " << event.window.width << "x" << event.window.height << std::endl;
            break;
        case yuga::core::EventType::KeyPress:
            std::cout << "Key pressed: " << static_cast<int>(event.key.key) << std::endl;
            break;
        default:
            break;
        }
    }
};

int main() {
    ExampleApp app;
    
    if (!app.initialize()) {
        std::cerr << "Failed to initialize application!" << std::endl;
        return -1;
    }

    app.run();
    app.shutdown();

    return 0;
}