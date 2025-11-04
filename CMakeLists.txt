cmake_minimum_required(VERSION 3.20)
project(YUGA VERSION 1.0.0)

# Enable C++ 20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Options
option(YUGA_BUILD_TESTS "Build tests" ON)
option(YUGA_USE_VULKAN "Build with Vulkan support" OFF)
option(YUGA_ENABLE_AI "Enable AI features" ON)

# Dependencies
find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED)
find_package(Bullet REQUIRED)
find_package(OpenAL REQUIRED)
find_package(Lua REQUIRED)
find_package(imgui REQUIRED)

# Add subdirectories for external dependencies
add_subdirectory(extern)

# Main engine library
add_library(yuga_engine
    src/core/engine.cpp
    src/graphics/opengl_renderer.cpp
    src/graphics/vulkan_renderer.cpp
    src/physics/bullet_physics.cpp
    src/audio/openal_system.cpp
    src/ui/imgui_system.cpp
    src/scripting/lua_vm.cpp
    src/ai/ai_system.cpp
    src/animation/animator.cpp
    src/asset/asset_manager.cpp
    src/debug/profiler.cpp
)

target_include_directories(yuga_engine PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OPENGL_INCLUDE_DIRS}
    ${BULLET_INCLUDE_DIRS}
    ${OPENAL_INCLUDE_DIR}
    ${LUA_INCLUDE_DIR}
    ${IMGUI_INCLUDE_DIRS}
)

target_link_libraries(yuga_engine PUBLIC
    ${OPENGL_LIBRARIES}
    glfw
    ${BULLET_LIBRARIES}
    ${OPENAL_LIBRARY}
    ${LUA_LIBRARIES}
    imgui
)

# Editor executable
add_executable(yuga_editor
    src/editor/main.cpp
    src/editor/editor_window.cpp
    src/editor/scene_view.cpp
    src/editor/asset_browser.cpp
)

target_link_libraries(yuga_editor PRIVATE
    yuga_engine
)

# Test executable
if(YUGA_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Install rules
install(TARGETS yuga_engine yuga_editor
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib/static
)

install(DIRECTORY include/
    DESTINATION include/yuga
    FILES_MATCHING PATTERN "*.h*"
)