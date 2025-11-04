struct ParticleVertex {
    @location(0) position: vec3<f32>,
    @location(1) size: vec2<f32>,
    @location(2) color: vec4<f32>,
    @location(3) rotation: f32,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) uv: vec2<f32>,
};

struct CameraUniform {
    view_proj: mat4x4<f32>,
    view_pos: vec3<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

@group(1) @binding(0)
var particle_texture: texture_2d<f32>;
@group(1) @binding(1)
var particle_sampler: sampler;

@vertex
fn vs_main(
    vertex: ParticleVertex,
    @builtin(vertex_index) vertex_index: u32,
) -> VertexOutput {
    var out: VertexOutput;
    
    // Generate quad vertices
    let quad_positions = array<vec2<f32>, 4>(
        vec2<f32>(-0.5, -0.5),
        vec2<f32>( 0.5, -0.5),
        vec2<f32>(-0.5,  0.5),
        vec2<f32>( 0.5,  0.5),
    );
    
    let uv = array<vec2<f32>, 4>(
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 0.0),
    );
    
    // Billboard rotation
    let cos_r = cos(vertex.rotation);
    let sin_r = sin(vertex.rotation);
    let rotation_matrix = mat2x2<f32>(
        vec2<f32>(cos_r, -sin_r),
        vec2<f32>(sin_r, cos_r),
    );
    
    // Apply size and rotation
    let quad_pos = quad_positions[vertex_index];
    let rotated_pos = rotation_matrix * (quad_pos * vertex.size);
    
    // Billboard facing camera
    let world_pos = vec4<f32>(vertex.position + vec3<f32>(rotated_pos, 0.0), 1.0);
    
    out.clip_position = camera.view_proj * world_pos;
    out.color = vertex.color;
    out.uv = uv[vertex_index];
    
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let texture_color = textureSample(particle_texture, particle_sampler, in.uv);
    return texture_color * in.color;
}