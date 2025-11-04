#pragma once

#include <cmath>
#include <array>

namespace yuga {
namespace math {

/**
 * @brief 4D vector class for general-purpose vector math
 */
class Vec4 {
public:
    float x, y, z, w;

    Vec4() : x(0), y(0), z(0), w(1) {}
    Vec4(float x, float y, float z, float w = 1.0f) : x(x), y(y), z(z), w(w) {}

    Vec4 operator+(const Vec4& other) const { return Vec4(x + other.x, y + other.y, z + other.z, w + other.w); }
    Vec4 operator-(const Vec4& other) const { return Vec4(x - other.x, y - other.y, z - other.z, w - other.w); }
    Vec4 operator*(float scalar) const { return Vec4(x * scalar, y * scalar, z * scalar, w * scalar); }
    Vec4 operator/(float scalar) const { return *this * (1.0f / scalar); }

    float dot(const Vec4& other) const { return x * other.x + y * other.y + z * other.z + w * other.w; }
    float length() const { return std::sqrt(dot(*this)); }
    Vec4 normalized() const { return *this / length(); }
};

/**
 * @brief 3D vector class optimized for 3D math
 */
class Vec3 {
public:
    float x, y, z;

    Vec3() : x(0), y(0), z(0) {}
    Vec3(float x, float y, float z) : x(x), y(y), z(z) {}
    explicit Vec3(const Vec4& v) : x(v.x), y(v.y), z(v.z) {}

    Vec3 operator+(const Vec3& other) const { return Vec3(x + other.x, y + other.y, z + other.z); }
    Vec3 operator-(const Vec3& other) const { return Vec3(x - other.x, y - other.y, z - other.z); }
    Vec3 operator*(float scalar) const { return Vec3(x * scalar, y * scalar, z * scalar); }
    Vec3 operator/(float scalar) const { return *this * (1.0f / scalar); }

    float dot(const Vec3& other) const { return x * other.x + y * other.y + z * other.z; }
    Vec3 cross(const Vec3& other) const {
        return Vec3(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }
    float length() const { return std::sqrt(dot(*this)); }
    Vec3 normalized() const { return *this / length(); }
};

/**
 * @brief 2D vector class for UI and texture coordinates
 */
class Vec2 {
public:
    float x, y;

    Vec2() : x(0), y(0) {}
    Vec2(float x, float y) : x(x), y(y) {}

    Vec2 operator+(const Vec2& other) const { return Vec2(x + other.x, y + other.y); }
    Vec2 operator-(const Vec2& other) const { return Vec2(x - other.x, y - other.y); }
    Vec2 operator*(float scalar) const { return Vec2(x * scalar, y * scalar); }
    Vec2 operator/(float scalar) const { return *this * (1.0f / scalar); }

    float dot(const Vec2& other) const { return x * other.x + y * other.y; }
    float length() const { return std::sqrt(dot(*this)); }
    Vec2 normalized() const { return *this / length(); }
};

/**
 * @brief 4x4 matrix class for 3D transformations
 */
class Mat4 {
public:
    std::array<float, 16> m;

    Mat4() {
        identity();
    }

    void identity() {
        m = {1, 0, 0, 0,
             0, 1, 0, 0,
             0, 0, 1, 0,
             0, 0, 0, 1};
    }

    static Mat4 translate(const Vec3& v) {
        Mat4 result;
        result.m[12] = v.x;
        result.m[13] = v.y;
        result.m[14] = v.z;
        return result;
    }

    static Mat4 scale(const Vec3& v) {
        Mat4 result;
        result.m[0] = v.x;
        result.m[5] = v.y;
        result.m[10] = v.z;
        return result;
    }

    static Mat4 rotateX(float angle) {
        float c = std::cos(angle);
        float s = std::sin(angle);
        Mat4 result;
        result.m[5] = c;
        result.m[6] = s;
        result.m[9] = -s;
        result.m[10] = c;
        return result;
    }

    static Mat4 rotateY(float angle) {
        float c = std::cos(angle);
        float s = std::sin(angle);
        Mat4 result;
        result.m[0] = c;
        result.m[2] = -s;
        result.m[8] = s;
        result.m[10] = c;
        return result;
    }

    static Mat4 rotateZ(float angle) {
        float c = std::cos(angle);
        float s = std::sin(angle);
        Mat4 result;
        result.m[0] = c;
        result.m[1] = s;
        result.m[4] = -s;
        result.m[5] = c;
        return result;
    }

    static Mat4 perspective(float fovy, float aspect, float near, float far) {
        float tanHalfFovy = std::tan(fovy / 2);
        Mat4 result;
        result.m[0] = 1 / (aspect * tanHalfFovy);
        result.m[5] = 1 / tanHalfFovy;
        result.m[10] = -(far + near) / (far - near);
        result.m[11] = -1;
        result.m[14] = -(2 * far * near) / (far - near);
        result.m[15] = 0;
        return result;
    }

    static Mat4 lookAt(const Vec3& eye, const Vec3& center, const Vec3& up) {
        Vec3 f = (center - eye).normalized();
        Vec3 s = f.cross(up).normalized();
        Vec3 u = s.cross(f);

        Mat4 result;
        result.m[0] = s.x;
        result.m[1] = u.x;
        result.m[2] = -f.x;
        result.m[4] = s.y;
        result.m[5] = u.y;
        result.m[6] = -f.y;
        result.m[8] = s.z;
        result.m[9] = u.z;
        result.m[10] = -f.z;
        result.m[12] = -s.dot(eye);
        result.m[13] = -u.dot(eye);
        result.m[14] = f.dot(eye);
        return result;
    }

    Mat4 operator*(const Mat4& other) const {
        Mat4 result;
        for (int i = 0; i < 4; ++i) {
            for (int j = 0; j < 4; ++j) {
                result.m[i * 4 + j] =
                    m[i * 4 + 0] * other.m[j + 0] +
                    m[i * 4 + 1] * other.m[j + 4] +
                    m[i * 4 + 2] * other.m[j + 8] +
                    m[i * 4 + 3] * other.m[j + 12];
            }
        }
        return result;
    }

    Vec4 operator*(const Vec4& v) const {
        return Vec4(
            m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * v.w,
            m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * v.w,
            m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * v.w,
            m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] * v.w
        );
    }
};

/**
 * @brief Quaternion class for rotations
 */
class Quat {
public:
    float x, y, z, w;

    Quat() : x(0), y(0), z(0), w(1) {}
    Quat(float x, float y, float z, float w) : x(x), y(y), z(z), w(w) {}

    static Quat fromAxisAngle(const Vec3& axis, float angle) {
        float halfAngle = angle * 0.5f;
        float s = std::sin(halfAngle);
        return Quat(
            axis.x * s,
            axis.y * s,
            axis.z * s,
            std::cos(halfAngle)
        );
    }

    static Quat fromEuler(float pitch, float yaw, float roll) {
        float cy = std::cos(yaw * 0.5f);
        float sy = std::sin(yaw * 0.5f);
        float cp = std::cos(pitch * 0.5f);
        float sp = std::sin(pitch * 0.5f);
        float cr = std::cos(roll * 0.5f);
        float sr = std::sin(roll * 0.5f);

        return Quat(
            sr * cp * cy - cr * sp * sy,
            cr * sp * cy + sr * cp * sy,
            cr * cp * sy - sr * sp * cy,
            cr * cp * cy + sr * sp * sy
        );
    }

    Quat operator*(const Quat& other) const {
        return Quat(
            w * other.x + x * other.w + y * other.z - z * other.y,
            w * other.y - x * other.z + y * other.w + z * other.x,
            w * other.z + x * other.y - y * other.x + z * other.w,
            w * other.w - x * other.x - y * other.y - z * other.z
        );
    }

    Vec3 rotate(const Vec3& v) const {
        Vec3 u(x, y, z);
        float s = w;
        return u * 2.0f * u.dot(v) +
               v * (s * s - u.dot(u)) +
               u.cross(v) * 2.0f * s;
    }

    Mat4 toMatrix() const {
        Mat4 result;
        float xx = x * x;
        float xy = x * y;
        float xz = x * z;
        float xw = x * w;
        float yy = y * y;
        float yz = y * z;
        float yw = y * w;
        float zz = z * z;
        float zw = z * w;

        result.m[0] = 1 - 2 * (yy + zz);
        result.m[1] = 2 * (xy - zw);
        result.m[2] = 2 * (xz + yw);

        result.m[4] = 2 * (xy + zw);
        result.m[5] = 1 - 2 * (xx + zz);
        result.m[6] = 2 * (yz - xw);

        result.m[8] = 2 * (xz - yw);
        result.m[9] = 2 * (yz + xw);
        result.m[10] = 1 - 2 * (xx + yy);

        return result;
    }
};

} // namespace math
} // namespace yuga