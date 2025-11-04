#pragma once

#include "yuga/ecs/EntityComponentSystem.hpp"
#include "yuga/components/Components.hpp"
#include "yuga/graphics/Renderer.hpp"
#include <vector>

namespace yuga {
namespace systems {

/**
 * @brief Base class for all systems
 */
class System {
public:
    virtual ~System() = default;
    virtual void update(float deltaTime) = 0;
    virtual void initialize(ecs::EntityComponentSystem* ecs) { m_ecs = ecs; }

protected:
    ecs::EntityComponentSystem* m_ecs;
};

/**
 * @brief System for processing transforms and hierarchies
 */
class TransformSystem : public System {
public:
    void update(float deltaTime) override {
        // Update world matrices in hierarchy order
        for (auto entity : m_entities) {
            auto& transform = m_ecs->getComponent<components::Transform>(entity);
            // TODO: Handle parent-child relationships
            // For now, just update local matrix
            m_worldMatrices[entity] = transform.getMatrix();
        }
    }

    const math::Mat4& getWorldMatrix(ecs::EntityID entity) const {
        return m_worldMatrices[entity];
    }

private:
    std::vector<ecs::EntityID> m_entities;
    std::unordered_map<ecs::EntityID, math::Mat4> m_worldMatrices;
};

/**
 * @brief System for rendering meshes
 */
class RenderSystem : public System {
public:
    void initialize(ecs::EntityComponentSystem* ecs, graphics::Renderer* renderer) {
        System::initialize(ecs);
        m_renderer = renderer;
    }

    void update(float deltaTime) override {
        // Find main camera
        components::Camera* mainCamera = nullptr;
        math::Mat4 viewMatrix;
        for (auto entity : m_cameraEntities) {
            auto& camera = m_ecs->getComponent<components::Camera>(entity);
            if (camera.main) {
                mainCamera = &camera;
                auto& transform = m_ecs->getComponent<components::Transform>(entity);
                math::Vec3 up(0, 1, 0);
                math::Vec3 forward = transform.rotation.rotate(math::Vec3(0, 0, -1));
                viewMatrix = math::Mat4::lookAt(
                    transform.position,
                    transform.position + forward,
                    up
                );
                break;
            }
        }

        if (!mainCamera) {
            return;
        }

        // Sort opaque and transparent meshes
        std::vector<ecs::EntityID> opaqueMeshes;
        std::vector<ecs::EntityID> transparentMeshes;
        for (auto entity : m_meshEntities) {
            auto& material = m_ecs->getComponent<components::Material>(entity);
            if (material.baseColor.w < 1.0f) {
                transparentMeshes.push_back(entity);
            } else {
                opaqueMeshes.push_back(entity);
            }
        }

        // Update lights
        updateLights();

        // Draw opaque meshes (front-to-back)
        for (auto entity : opaqueMeshes) {
            drawMesh(entity, mainCamera, viewMatrix);
        }

        // Draw transparent meshes (back-to-front)
        for (auto entity : transparentMeshes) {
            drawMesh(entity, mainCamera, viewMatrix);
        }
    }

private:
    void updateLights() {
        // TODO: Update light uniforms in shader
    }

    void drawMesh(ecs::EntityID entity, components::Camera* camera, const math::Mat4& viewMatrix) {
        auto& mesh = m_ecs->getComponent<components::Mesh>(entity);
        auto& material = m_ecs->getComponent<components::Material>(entity);
        auto& transform = m_ecs->getComponent<components::Transform>(entity);

        // Set shader uniforms
        material.shader->bind();
        material.shader->setUniform("model", transform.getMatrix());
        material.shader->setUniform("view", viewMatrix);
        material.shader->setUniform("projection", camera->getProjectionMatrix());

        // Bind textures
        if (material.albedoMap) {
            material.albedoMap->bind(0);
            material.shader->setUniform("albedoMap", 0);
        }
        if (material.normalMap) {
            material.normalMap->bind(1);
            material.shader->setUniform("normalMap", 1);
        }
        if (material.metallicRoughnessMap) {
            material.metallicRoughnessMap->bind(2);
            material.shader->setUniform("metallicRoughnessMap", 2);
        }

        // Draw mesh
        mesh.vertexBuffer->bind();
        mesh.indexBuffer->bind();
        m_renderer->drawIndexed(mesh.indexCount, 0);
    }

    graphics::Renderer* m_renderer;
    std::vector<ecs::EntityID> m_meshEntities;
    std::vector<ecs::EntityID> m_cameraEntities;
    std::vector<ecs::EntityID> m_lightEntities;
};

/**
 * @brief System for physics simulation
 */
class PhysicsSystem : public System {
public:
    void update(float deltaTime) override {
        // Update physics bodies
        for (auto entity : m_entities) {
            auto& rigidBody = m_ecs->getComponent<components::RigidBody>(entity);
            if (rigidBody.type != components::RigidBody::Type::Static) {
                auto& transform = m_ecs->getComponent<components::Transform>(entity);

                // Simple velocity integration
                transform.position = transform.position + rigidBody.velocity * deltaTime;
                
                // Simple angular velocity integration
                math::Quat rot = math::Quat::fromAxisAngle(
                    rigidBody.angularVelocity.normalized(),
                    rigidBody.angularVelocity.length() * deltaTime
                );
                transform.rotation = rot * transform.rotation;

                // TODO: Add proper collision detection and response
            }
        }
    }

private:
    std::vector<ecs::EntityID> m_entities;
};

/**
 * @brief System for script execution
 */
class ScriptSystem : public System {
public:
    void update(float deltaTime) override {
        for (auto entity : m_entities) {
            auto& script = m_ecs->getComponent<components::Script>(entity);
            if (script.enabled && script.instance) {
                script.instance->update(deltaTime);
            }
        }
    }

private:
    std::vector<ecs::EntityID> m_entities;
};

} // namespace systems
} // namespace yuga