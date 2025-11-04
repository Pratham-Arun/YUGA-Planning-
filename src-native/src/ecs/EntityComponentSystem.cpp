#include "yuga/ecs/EntityComponentSystem.hpp"

namespace yuga {
namespace ecs {

bool EntityComponentSystem::initialize() {
    // Initialize with a pool of reusable entities
    for (EntityID entity = 0; entity < 5000; ++entity) {
        m_availableEntities.push(entity);
    }

    return true;
}

void EntityComponentSystem::shutdown() {
    m_systems.clear();
    m_componentArrays.clear();
    m_signatures.clear();
    m_entities.clear();
}

EntityID EntityComponentSystem::createEntity() {
    EntityID id = m_availableEntities.front();
    m_availableEntities.pop();
    m_livingEntityCount++;

    if (id >= m_signatures.size()) {
        m_signatures.resize(id + 1);
    }

    return id;
}

void EntityComponentSystem::destroyEntity(EntityID entity) {
    // Remove from all component arrays
    for (auto const& pair : m_componentArrays) {
        auto const& component = pair.second;
        component->entityDestroyed(entity);
    }

    // Reset signature
    m_signatures[entity].reset();

    // Make ID available again
    m_availableEntities.push(entity);
    m_livingEntityCount--;
}

void EntityComponentSystem::update(float deltaTime) {
    // Update all registered systems
    for (auto& pair : m_systems) {
        auto& system = pair.second;
        system->update(deltaTime);
    }
}

} // namespace ecs
} // namespace yuga