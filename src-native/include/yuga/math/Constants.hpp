#pragma once

namespace yuga {
namespace math {

constexpr float PI = 3.14159265358979323846f;
constexpr float TWO_PI = 2.0f * PI;
constexpr float HALF_PI = PI / 2.0f;
constexpr float QUARTER_PI = PI / 4.0f;
constexpr float INV_PI = 1.0f / PI;
constexpr float DEG_TO_RAD = PI / 180.0f;
constexpr float RAD_TO_DEG = 180.0f / PI;
constexpr float EPSILON = 1e-6f;
constexpr float INFINITY_F = std::numeric_limits<float>::infinity();

// Utility constexpr functions
constexpr float toRadians(float degrees) {
    return degrees * DEG_TO_RAD;
}

constexpr float toDegrees(float radians) {
    return radians * RAD_TO_DEG;
}

} // namespace math
} // namespace yuga