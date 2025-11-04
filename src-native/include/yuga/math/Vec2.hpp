#pragma once

#include <cmath>

namespace yuga {
namespace math {

class Vec2 {
public:
    float x, y;

    // Constructors
    Vec2() : x(0.0f), y(0.0f) {}
    Vec2(float x, float y) : x(x), y(y) {}
    Vec2(const Vec2& other) : x(other.x), y(other.y) {}

    // Assignment operator
    Vec2& operator=(const Vec2& other) {
        x = other.x;
        y = other.y;
        return *this;
    }

    // Arithmetic operators
    Vec2 operator+(const Vec2& other) const {
        return Vec2(x + other.x, y + other.y);
    }

    Vec2 operator-(const Vec2& other) const {
        return Vec2(x - other.x, y - other.y);
    }

    Vec2 operator*(float scalar) const {
        return Vec2(x * scalar, y * scalar);
    }

    Vec2 operator/(float scalar) const {
        float invScalar = 1.0f / scalar;
        return Vec2(x * invScalar, y * invScalar);
    }

    // Compound assignment operators
    Vec2& operator+=(const Vec2& other) {
        x += other.x;
        y += other.y;
        return *this;
    }

    Vec2& operator-=(const Vec2& other) {
        x -= other.x;
        y -= other.y;
        return *this;
    }

    Vec2& operator*=(float scalar) {
        x *= scalar;
        y *= scalar;
        return *this;
    }

    Vec2& operator/=(float scalar) {
        float invScalar = 1.0f / scalar;
        x *= invScalar;
        y *= invScalar;
        return *this;
    }

    // Utility methods
    float length() const {
        return std::sqrt(x * x + y * y);
    }

    float lengthSquared() const {
        return x * x + y * y;
    }

    Vec2 normalized() const {
        float len = length();
        if (len > 0) {
            float invLen = 1.0f / len;
            return Vec2(x * invLen, y * invLen);
        }
        return *this;
    }

    void normalize() {
        float len = length();
        if (len > 0) {
            float invLen = 1.0f / len;
            x *= invLen;
            y *= invLen;
        }
    }

    float dot(const Vec2& other) const {
        return x * other.x + y * other.y;
    }

    static float distance(const Vec2& a, const Vec2& b) {
        return (b - a).length();
    }

    static float distanceSquared(const Vec2& a, const Vec2& b) {
        return (b - a).lengthSquared();
    }

    // Constants
    static const Vec2 Zero;
    static const Vec2 One;
    static const Vec2 UnitX;
    static const Vec2 UnitY;
};

// Define static constants
inline const Vec2 Vec2::Zero(0.0f, 0.0f);
inline const Vec2 Vec2::One(1.0f, 1.0f);
inline const Vec2 Vec2::UnitX(1.0f, 0.0f);
inline const Vec2 Vec2::UnitY(0.0f, 1.0f);

// Free functions for scalar multiplication
inline Vec2 operator*(float scalar, const Vec2& vec) {
    return vec * scalar;
}

} // namespace math
} // namespace yuga