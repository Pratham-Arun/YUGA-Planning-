#pragma once

#include <string>
#include <memory>
#include <functional>
#include <any>
#include <unordered_map>

namespace yuga::scripting {

class ScriptContext;
class ScriptObject;

using ScriptFunction = std::function<void(ScriptContext*)>;

class ScriptSystem {
public:
    virtual ~ScriptSystem() = default;

    // Initialization
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;
    
    // Script loading
    virtual bool load_script(const std::string& path) = 0;
    virtual bool reload_script(const std::string& path) = 0;
    virtual void unload_script(const std::string& path) = 0;

    // Script execution
    virtual bool execute_string(const std::string& code) = 0;
    virtual bool execute_file(const std::string& path) = 0;
    
    // Object creation and manipulation
    virtual std::shared_ptr<ScriptObject> create_object(const std::string& class_name) = 0;
    virtual void destroy_object(ScriptObject* object) = 0;

    // Native function binding
    virtual void register_function(const std::string& name, ScriptFunction function) = 0;
    virtual void register_type(const std::string& name, const std::unordered_map<std::string, ScriptFunction>& methods) = 0;

    // State management
    virtual void collect_garbage() = 0;
    virtual void reset_state() = 0;

    // Error handling
    virtual std::string get_last_error() const = 0;
    virtual void set_error_handler(std::function<void(const std::string&)> handler) = 0;

protected:
    ScriptSystem() = default;
};

class ScriptObject {
public:
    virtual ~ScriptObject() = default;

    // Property access
    virtual void set_property(const std::string& name, const std::any& value) = 0;
    virtual std::any get_property(const std::string& name) const = 0;

    // Method calls
    virtual std::any call_method(const std::string& name, const std::vector<std::any>& args = {}) = 0;

    // Event handlers
    virtual void set_event_handler(const std::string& event, std::function<void()> handler) = 0;
    virtual void trigger_event(const std::string& event) = 0;
};

} // namespace yuga::scripting