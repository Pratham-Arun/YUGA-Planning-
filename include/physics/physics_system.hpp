#pragma once

#include <memory>
#include <vector>
#include <glm/glm.hpp>

namespace yuga::physics {

class RigidBody;
class Collider;
class PhysicsDebugDrawer;

struct RaycastHit {
    float distance;
    glm::vec3 point;
    glm::vec3 normal;
    RigidBody* body;
};

class PhysicsSystem {
public:
    virtual ~PhysicsSystem() = default;

    // Initialization
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;

    // Simulation
    virtual void update(float delta_time) = 0;
    virtual void set_gravity(const glm::vec3& gravity) = 0;
    virtual glm::vec3 get_gravity() const = 0;

    // Bodies and colliders
    virtual std::shared_ptr<RigidBody> create_rigid_body() = 0;
    virtual std::shared_ptr<Collider> create_box_collider(const glm::vec3& size) = 0;
    virtual std::shared_ptr<Collider> create_sphere_collider(float radius) = 0;
    virtual std::shared_ptr<Collider> create_capsule_collider(float radius, float height) = 0;
    virtual std::shared_ptr<Collider> create_mesh_collider(const std::vector<glm::vec3>& vertices, const std::vector<uint32_t>& indices) = 0;

    // Queries
    virtual bool raycast(const glm::vec3& origin, const glm::vec3& direction, float max_distance, RaycastHit* hit) = 0;
    virtual std::vector<RigidBody*> overlap_sphere(const glm::vec3& center, float radius) = 0;
    virtual std::vector<RigidBody*> overlap_box(const glm::vec3& center, const glm::vec3& half_extents) = 0;

    // Debug visualization
    virtual void set_debug_draw_enabled(bool enabled) = 0;
    virtual void set_debug_drawer(PhysicsDebugDrawer* drawer) = 0;

protected:
    PhysicsSystem() = default;
};

} // namespace yuga::physics