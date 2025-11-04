#version 330 core

in vec3 FragPos;
in vec3 Normal;
in vec2 TexCoord;

uniform float use_texture;
uniform sampler2D tex;

out vec4 FragColor;

void main()
{
    // Basic lighting calculation
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    vec3 norm = normalize(Normal);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * vec3(1.0);

    // Ambient light
    vec3 ambient = vec3(0.1);

    // Final color calculation
    vec3 result = (ambient + diffuse);

    if (use_texture > 0.5) {
        vec4 texColor = texture(tex, TexCoord);
        FragColor = vec4(result * texColor.rgb, texColor.a);
    } else {
        FragColor = vec4(result, 1.0);
    }
}