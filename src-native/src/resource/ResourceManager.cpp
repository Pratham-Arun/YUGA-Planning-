#include "yuga/resource/ResourceManager.hpp"

namespace yuga {
namespace resource {

bool ResourceManager::initialize() {
    return true;
}

void ResourceManager::shutdown() {
    unloadAll();
}

} // namespace resource
} // namespace yuga