#pragma once

#include <cstdint>
#include <bitset>
#include <vector>
#include <unordered_map>
#include <memory>
#include <typeindex>

namespace yuga {
namespace ecs {

// Type aliases for clarity
using EntityID = std::uint32_t;
using ComponentTypeID = std::uint32_t;
using Signature = std::bitset<64>; // Maximum 64 different component types

// Forward declarations
class IComponent;
class IComponentArray;
class Entity;
class System;

/**
 * @brief Base interface for all components
 */
class IComponent {
public:
    virtual ~IComponent() = default;
};

/**
 * @brief Base interface for component storage
 */
class IComponentArray {
public:
    virtual ~IComponentArray() = default;
    virtual void entityDestroyed(EntityID entity) = 0;
};

/**
 * @brief Typed storage for components of a specific type
 */
template<typename T>
class ComponentArray : public IComponentArray {
public:
    void insertData(EntityID entity, T component) {
        size_t newIndex = m_size;
        m_entityToIndexMap[entity] = newIndex;
        m_indexToEntityMap[newIndex] = entity;
        m_componentArray[newIndex] = component;
        ++m_size;
    }

    void removeData(EntityID entity) {
        size_t indexOfRemovedEntity = m_entityToIndexMap[entity];
        size_t indexOfLastElement = m_size - 1;
        m_componentArray[indexOfRemovedEntity] = m_componentArray[indexOfLastElement];

        EntityID entityOfLastElement = m_indexToEntityMap[indexOfLastElement];
        m_entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
        m_indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

        m_entityToIndexMap.erase(entity);
        m_indexToEntityMap.erase(indexOfLastElement);
        --m_size;
    }

    T& getData(EntityID entity) {
        return m_componentArray[m_entityToIndexMap[entity]];
    }

    void entityDestroyed(EntityID entity) override {
        if (m_entityToIndexMap.find(entity) != m_entityToIndexMap.end()) {
            removeData(entity);
        }
    }

private:
    std::array<T, 5000> m_componentArray; // Fixed size for cache-friendliness
    std::unordered_map<EntityID, size_t> m_entityToIndexMap;
    std::unordered_map<size_t, EntityID> m_indexToEntityMap;
    size_t m_size{0};
};

/**
 * @brief Central registry for all ECS components and systems
 */
class EntityComponentSystem {
public:
    bool initialize();
    void shutdown();
    void update(float deltaTime);

    // Entity management
    EntityID createEntity();
    void destroyEntity(EntityID entity);

    // Component management
    template<typename T>
    void registerComponent() {
        const char* typeName = typeid(T).name();
        m_componentTypes.insert({typeName, m_nextComponentType});
        m_componentArrays.insert({typeName, std::make_shared<ComponentArray<T>>()});
        ++m_nextComponentType;
    }

    template<typename T>
    void addComponent(EntityID entity, T component) {
        getComponentArray<T>()->insertData(entity, component);
        auto signature = m_signatures[entity];
        signature.set(getComponentType<T>(), true);
        m_signatures[entity] = signature;
    }

    template<typename T>
    void removeComponent(EntityID entity) {
        getComponentArray<T>()->removeData(entity);
        auto signature = m_signatures[entity];
        signature.set(getComponentType<T>(), false);
        m_signatures[entity] = signature;
    }

    template<typename T>
    T& getComponent(EntityID entity) {
        return getComponentArray<T>()->getData(entity);
    }

    template<typename T>
    ComponentTypeID getComponentType() {
        const char* typeName = typeid(T).name();
        return m_componentTypes[typeName];
    }

    // System management
    template<typename T>
    std::shared_ptr<T> registerSystem() {
        const char* typeName = typeid(T).name();
        auto system = std::make_shared<T>();
        m_systems.insert({typeName, system});
        return system;
    }

    template<typename T>
    void setSystemSignature(Signature signature) {
        const char* typeName = typeid(T).name();
        m_systemSignatures.insert({typeName, signature});
    }

private:
    template<typename T>
    std::shared_ptr<ComponentArray<T>> getComponentArray() {
        const char* typeName = typeid(T).name();
        return std::static_pointer_cast<ComponentArray<T>>(m_componentArrays[typeName]);
    }

    // Entity management
    std::vector<EntityID> m_entities;
    std::vector<Signature> m_signatures;
    std::queue<EntityID> m_availableEntities;
    uint32_t m_livingEntityCount{0};

    // Component management
    std::unordered_map<const char*, ComponentTypeID> m_componentTypes;
    std::unordered_map<const char*, std::shared_ptr<IComponentArray>> m_componentArrays;
    ComponentTypeID m_nextComponentType{0};

    // System management
    std::unordered_map<const char*, std::shared_ptr<System>> m_systems;
    std::unordered_map<const char*, Signature> m_systemSignatures;
};

} // namespace ecs
} // namespace yuga