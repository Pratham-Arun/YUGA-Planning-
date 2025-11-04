#pragma once

#include "yuga/math/Math.hpp"
#include "yuga/ecs/EntityComponentSystem.hpp"

namespace yuga {
namespace components {

/**
 * @brief Transform component for position, rotation, and scale
 */
struct Transform : public ecs::IComponent {
    math::Vec3 position;
    math::Quat rotation;
    math::Vec3 scale;

    Transform()
        : position(0, 0, 0)
        , rotation()
        , scale(1, 1, 1)
    {}

    math::Mat4 getMatrix() const {
        return math::Mat4::translate(position) *
               rotation.toMatrix() *
               math::Mat4::scale(scale);
    }
};

/**
 * @brief Camera component for view and projection
 */
struct Camera : public ecs::IComponent {
    float fov;
    float aspect;
    float nearPlane;
    float farPlane;
    bool main;

    Camera()
        : fov(60.0f * 3.14159f / 180.0f)
        , aspect(16.0f / 9.0f)
        , nearPlane(0.1f)
        , farPlane(1000.0f)
        , main(false)
    {}

    math::Mat4 getProjectionMatrix() const {
        return math::Mat4::perspective(fov, aspect, nearPlane, farPlane);
    }
};

/**
 * @brief Light component for illumination
 */
struct Light : public ecs::IComponent {
    enum class Type {
        Directional,
        Point,
        Spot
    };

    Type type;
    math::Vec3 color;
    float intensity;
    float range;        // Point/Spot lights only
    float spotAngle;    // Spot lights only
    bool castShadows;

    Light()
        : type(Type::Point)
        , color(1, 1, 1)
        , intensity(1.0f)
        , range(10.0f)
        , spotAngle(45.0f * 3.14159f / 180.0f)
        , castShadows(false)
    {}
};

/**
 * @brief Mesh component for 3D geometry
 */
struct Mesh : public ecs::IComponent {
    std::shared_ptr<class VertexBuffer> vertexBuffer;
    std::shared_ptr<class IndexBuffer> indexBuffer;
    std::shared_ptr<class Material> material;
    uint32_t vertexCount;
    uint32_t indexCount;
    math::Vec3 boundingBoxMin;
    math::Vec3 boundingBoxMax;

    Mesh()
        : vertexCount(0)
        , indexCount(0)
        , boundingBoxMin(0, 0, 0)
        , boundingBoxMax(0, 0, 0)
    {}
};

/**
 * @brief Material component for surface properties
 */
struct Material : public ecs::IComponent {
    std::shared_ptr<class Shader> shader;
    std::shared_ptr<class Texture> albedoMap;
    std::shared_ptr<class Texture> normalMap;
    std::shared_ptr<class Texture> metallicRoughnessMap;
    std::shared_ptr<class Texture> emissiveMap;

    math::Vec4 baseColor;
    float metallic;
    float roughness;
    float emissive;
    bool doubleSided;

    Material()
        : baseColor(1, 1, 1, 1)
        , metallic(0.0f)
        , roughness(0.5f)
        , emissive(0.0f)
        , doubleSided(false)
    {}
};

/**
 * @brief RigidBody component for physics
 */
struct RigidBody : public ecs::IComponent {
    enum class Type {
        Static,
        Dynamic,
        Kinematic
    };

    Type type;
    float mass;
    float friction;
    float restitution;
    bool sensor;
    math::Vec3 velocity;
    math::Vec3 angularVelocity;

    RigidBody()
        : type(Type::Static)
        , mass(1.0f)
        , friction(0.5f)
        , restitution(0.0f)
        , sensor(false)
        , velocity(0, 0, 0)
        , angularVelocity(0, 0, 0)
    {}
};

/**
 * @brief Script component for game logic
 */
struct Script : public ecs::IComponent {
    std::shared_ptr<class ScriptInstance> instance;
    std::string scriptPath;
    bool enabled;

    Script()
        : enabled(true)
    {}
};

} // namespace components
} // namespace yuga