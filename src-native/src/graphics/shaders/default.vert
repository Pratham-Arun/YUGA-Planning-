#version 330 core

layout (location = 0) in vec3 position;
layout (location = 1) in vec3 normal;
layout (location = 2) in vec2 uv;

uniform mat4 transform;

out vec3 FragPos;
out vec3 Normal;
out vec2 TexCoord;

void main()
{
    gl_Position = transform * vec4(position, 1.0);
    FragPos = vec3(transform * vec4(position, 1.0));
    Normal = mat3(transpose(inverse(transform))) * normal;
    TexCoord = uv;
}