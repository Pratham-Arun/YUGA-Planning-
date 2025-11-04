#pragma once

#include <string>
#include <memory>
#include <unordered_map>
#include <filesystem>

namespace yuga {
namespace resource {

/**
 * @brief Base class for all resource types
 */
class Resource {
public:
    virtual ~Resource() = default;
    virtual bool load(const std::filesystem::path& path) = 0;
    virtual void unload() = 0;
    bool isLoaded() const { return m_loaded; }

protected:
    bool m_loaded = false;
};

/**
 * @brief Resource handle for safe resource reference counting
 */
template<typename T>
class ResourceHandle {
public:
    ResourceHandle() : m_resource(nullptr) {}
    explicit ResourceHandle(std::shared_ptr<T> resource) : m_resource(resource) {}

    T* operator->() const { return m_resource.get(); }
    T& operator*() const { return *m_resource; }
    operator bool() const { return m_resource != nullptr; }

private:
    std::shared_ptr<T> m_resource;
};

/**
 * @brief Central resource management system
 */
class ResourceManager {
public:
    bool initialize();
    void shutdown();

    /**
     * @brief Load a resource from file
     * @param path Path to the resource file
     * @return Handle to the loaded resource
     */
    template<typename T>
    ResourceHandle<T> load(const std::filesystem::path& path) {
        // Check if already loaded
        std::string key = path.string();
        auto it = m_resources.find(key);
        if (it != m_resources.end()) {
            return ResourceHandle<T>(std::static_pointer_cast<T>(it->second));
        }

        // Create and load new resource
        auto resource = std::make_shared<T>();
        if (!resource->load(path)) {
            return ResourceHandle<T>();
        }

        m_resources[key] = resource;
        return ResourceHandle<T>(resource);
    }

    /**
     * @brief Create a new resource in memory
     * @param name Unique name for the resource
     * @return Handle to the created resource
     */
    template<typename T>
    ResourceHandle<T> create(const std::string& name) {
        auto resource = std::make_shared<T>();
        m_resources[name] = resource;
        return ResourceHandle<T>(resource);
    }

    /**
     * @brief Get a resource by name
     * @param name Name of the resource
     * @return Handle to the resource
     */
    template<typename T>
    ResourceHandle<T> get(const std::string& name) {
        auto it = m_resources.find(name);
        if (it != m_resources.end()) {
            return ResourceHandle<T>(std::static_pointer_cast<T>(it->second));
        }
        return ResourceHandle<T>();
    }

    /**
     * @brief Unload a resource
     * @param name Name of the resource to unload
     */
    void unload(const std::string& name) {
        auto it = m_resources.find(name);
        if (it != m_resources.end()) {
            it->second->unload();
            m_resources.erase(it);
        }
    }

    /**
     * @brief Unload all resources
     */
    void unloadAll() {
        for (auto& pair : m_resources) {
            pair.second->unload();
        }
        m_resources.clear();
    }

private:
    std::unordered_map<std::string, std::shared_ptr<Resource>> m_resources;
};

} // namespace resource
} // namespace yuga