//! Graphics abstraction layer for YUGA using OpenGL
//! This module provides a safe, high-level abstraction over OpenGL 

use gl;
use glutin;
use std::sync::Arc;
use std::collections::HashMap;

/// Result type for graphics operations
pub type GraphicsResult<T> = Result<T, GraphicsError>;

/// Error type for graphics operations
#[derive(Debug)]
pub enum GraphicsError {
    /// Context creation failed
    ContextCreation(String),
    /// Shader compilation failed
    ShaderCompilation(String),
    /// Program linking failed
    ProgramLinking(String),
    /// Buffer creation failed
    BufferCreation(String),
    /// Texture creation failed
    TextureCreation(String),
    /// Resource not found
    ResourceNotFound(String),
}

/// Vertex data structure
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct Vertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
    pub uv: [f32; 2],
}

/// Graphics context wrapping OpenGL state
pub struct GraphicsContext {
    gl_context: glutin::WindowedContext<glutin::PossiblyCurrent>,
    shader_cache: HashMap<String, Arc<ShaderProgram>>,
    current_shader: Option<Arc<ShaderProgram>>,
    default_vao: u32,
}

impl GraphicsContext {
    /// Create a new graphics context
    pub fn new(window: glutin::WindowedContext<glutin::NotCurrent>) -> GraphicsResult<Self> {
        let gl_context = unsafe {
            window.make_current()
                .map_err(|e| GraphicsError::ContextCreation(e.to_string()))?
        };

        gl::load_with(|s| gl_context.get_proc_address(s) as *const _);

        let mut vao = 0;
        unsafe {
            gl::GenVertexArrays(1, &mut vao);
            gl::BindVertexArray(vao);
        }

        Ok(Self {
            gl_context,
            shader_cache: HashMap::new(),
            current_shader: None,
            default_vao: vao,
        })
    }

    /// Clear the color and depth buffers
    pub fn clear(&self, r: f32, g: f32, b: f32, a: f32) {
        unsafe {
            gl::ClearColor(r, g, b, a);
            gl::Clear(gl::COLOR_BUFFER_BIT | gl::DEPTH_BUFFER_BIT);
        }
    }

    /// Swap buffers and poll events
    pub fn swap_buffers(&self) -> GraphicsResult<()> {
        self.gl_context.swap_buffers()
            .map_err(|e| GraphicsError::ContextCreation(e.to_string()))?;
        Ok(())
    }

    /// Create a new shader program from vertex and fragment shader sources
    pub fn create_shader(&mut self, name: &str, vert_src: &str, frag_src: &str) -> GraphicsResult<Arc<ShaderProgram>> {
        if let Some(shader) = self.shader_cache.get(name) {
            return Ok(Arc::clone(shader));
        }

        let shader = Arc::new(ShaderProgram::new(vert_src, frag_src)?);
        self.shader_cache.insert(name.to_string(), Arc::clone(&shader));
        Ok(shader)
    }

    /// Bind a shader program for use
    pub fn use_shader(&mut self, shader: Arc<ShaderProgram>) {
        if self.current_shader.as_ref().map(|s| Arc::ptr_eq(s, &shader)) == Some(true) {
            return;
        }
        unsafe {
            gl::UseProgram(shader.program_id);
        }
        self.current_shader = Some(shader);
    }
}

impl Drop for GraphicsContext {
    fn drop(&mut self) {
        unsafe {
            gl::DeleteVertexArrays(1, &self.default_vao);
        }
    }
}

/// Shader program wrapping OpenGL shader program
pub struct ShaderProgram {
    program_id: u32,
    uniforms: HashMap<String, i32>,
}

impl ShaderProgram {
    /// Create a new shader program from vertex and fragment shader sources
    pub fn new(vert_src: &str, frag_src: &str) -> GraphicsResult<Self> {
        let vert_shader = Self::compile_shader(vert_src, gl::VERTEX_SHADER)?;
        let frag_shader = Self::compile_shader(frag_src, gl::FRAGMENT_SHADER)?;

        let program_id = unsafe { gl::CreateProgram() };

        unsafe {
            gl::AttachShader(program_id, vert_shader);
            gl::AttachShader(program_id, frag_shader);
            gl::LinkProgram(program_id);

            gl::DeleteShader(vert_shader);
            gl::DeleteShader(frag_shader);

            let mut success = 0;
            gl::GetProgramiv(program_id, gl::LINK_STATUS, &mut success);

            if success == 0 {
                let mut len = 0;
                gl::GetProgramiv(program_id, gl::INFO_LOG_LENGTH, &mut len);
                let mut buffer = vec![0u8; len as usize];
                gl::GetProgramInfoLog(
                    program_id,
                    len,
                    std::ptr::null_mut(),
                    buffer.as_mut_ptr() as *mut i8,
                );
                return Err(GraphicsError::ProgramLinking(
                    String::from_utf8_lossy(&buffer).to_string(),
                ));
            }
        }

        Ok(Self {
            program_id,
            uniforms: HashMap::new(),
        })
    }

    /// Set a uniform float value
    pub fn set_float(&self, name: &str, value: f32) {
        let location = self.get_uniform_location(name);
        unsafe {
            gl::Uniform1f(location, value);
        }
    }

    /// Set a uniform vec3 value
    pub fn set_vec3(&self, name: &str, value: [f32; 3]) {
        let location = self.get_uniform_location(name);
        unsafe {
            gl::Uniform3f(location, value[0], value[1], value[2]);
        }
    }

    /// Set a uniform mat4 value
    pub fn set_mat4(&self, name: &str, value: &[f32; 16]) {
        let location = self.get_uniform_location(name);
        unsafe {
            gl::UniformMatrix4fv(location, 1, gl::FALSE, value.as_ptr());
        }
    }

    fn get_uniform_location(&self, name: &str) -> i32 {
        if let Some(&location) = self.uniforms.get(name) {
            return location;
        }
        unsafe {
            gl::GetUniformLocation(self.program_id, name.as_ptr() as *const i8)
        }
    }

    fn compile_shader(source: &str, shader_type: u32) -> GraphicsResult<u32> {
        let shader = unsafe { gl::CreateShader(shader_type) };

        unsafe {
            gl::ShaderSource(
                shader,
                1,
                &(source.as_ptr() as *const i8),
                &(source.len() as i32),
            );
            gl::CompileShader(shader);

            let mut success = 0;
            gl::GetShaderiv(shader, gl::COMPILE_STATUS, &mut success);

            if success == 0 {
                let mut len = 0;
                gl::GetShaderiv(shader, gl::INFO_LOG_LENGTH, &mut len);
                let mut buffer = vec![0u8; len as usize];
                gl::GetShaderInfoLog(
                    shader,
                    len,
                    std::ptr::null_mut(),
                    buffer.as_mut_ptr() as *mut i8,
                );
                return Err(GraphicsError::ShaderCompilation(
                    String::from_utf8_lossy(&buffer).to_string(),
                ));
            }
        }

        Ok(shader)
    }
}

impl Drop for ShaderProgram {
    fn drop(&mut self) {
        unsafe {
            gl::DeleteProgram(self.program_id);
        }
    }
}

/// Vertex buffer object wrapping OpenGL VBO
pub struct VertexBuffer {
    vbo_id: u32,
    count: usize,
}

impl VertexBuffer {
    /// Create a new vertex buffer from vertex data
    pub fn new(vertices: &[Vertex]) -> GraphicsResult<Self> {
        let mut vbo = 0;
        unsafe {
            gl::GenBuffers(1, &mut vbo);
            gl::BindBuffer(gl::ARRAY_BUFFER, vbo);
            gl::BufferData(
                gl::ARRAY_BUFFER,
                (vertices.len() * std::mem::size_of::<Vertex>()) as isize,
                vertices.as_ptr() as *const _,
                gl::STATIC_DRAW,
            );

            // Position attribute
            gl::VertexAttribPointer(
                0,
                3,
                gl::FLOAT,
                gl::FALSE,
                std::mem::size_of::<Vertex>() as i32,
                std::ptr::null(),
            );
            gl::EnableVertexAttribArray(0);

            // Normal attribute
            gl::VertexAttribPointer(
                1,
                3,
                gl::FLOAT,
                gl::FALSE,
                std::mem::size_of::<Vertex>() as i32,
                (3 * std::mem::size_of::<f32>()) as *const _,
            );
            gl::EnableVertexAttribArray(1);

            // UV attribute
            gl::VertexAttribPointer(
                2,
                2,
                gl::FLOAT,
                gl::FALSE,
                std::mem::size_of::<Vertex>() as i32,
                (6 * std::mem::size_of::<f32>()) as *const _,
            );
            gl::EnableVertexAttribArray(2);
        }

        Ok(Self {
            vbo_id: vbo,
            count: vertices.len(),
        })
    }

    /// Draw the vertex buffer
    pub fn draw(&self) {
        unsafe {
            gl::DrawArrays(gl::TRIANGLES, 0, self.count as i32);
        }
    }
}

impl Drop for VertexBuffer {
    fn drop(&mut self) {
        unsafe {
            gl::DeleteBuffers(1, &self.vbo_id);
        }
    }
}

/// Texture wrapping OpenGL texture
pub struct Texture {
    texture_id: u32,
    width: u32,
    height: u32,
}

impl Texture {
    /// Create a new texture from raw image data
    pub fn new(width: u32, height: u32, data: &[u8]) -> GraphicsResult<Self> {
        let mut texture_id = 0;
        unsafe {
            gl::GenTextures(1, &mut texture_id);
            gl::BindTexture(gl::TEXTURE_2D, texture_id);

            gl::TexParameteri(gl::TEXTURE_2D, gl::TEXTURE_WRAP_S, gl::REPEAT as i32);
            gl::TexParameteri(gl::TEXTURE_2D, gl::TEXTURE_WRAP_T, gl::REPEAT as i32);
            gl::TexParameteri(gl::TEXTURE_2D, gl::TEXTURE_MIN_FILTER, gl::LINEAR as i32);
            gl::TexParameteri(gl::TEXTURE_2D, gl::TEXTURE_MAG_FILTER, gl::LINEAR as i32);

            gl::TexImage2D(
                gl::TEXTURE_2D,
                0,
                gl::RGBA as i32,
                width as i32,
                height as i32,
                0,
                gl::RGBA,
                gl::UNSIGNED_BYTE,
                data.as_ptr() as *const _,
            );
            gl::GenerateMipmap(gl::TEXTURE_2D);
        }

        Ok(Self {
            texture_id,
            width,
            height,
        })
    }

    /// Bind the texture for use
    pub fn bind(&self, unit: u32) {
        unsafe {
            gl::ActiveTexture(gl::TEXTURE0 + unit);
            gl::BindTexture(gl::TEXTURE_2D, self.texture_id);
        }
    }

    /// Get the texture dimensions
    pub fn dimensions(&self) -> (u32, u32) {
        (self.width, self.height)
    }
}

impl Drop for Texture {
    fn drop(&mut self) {
        unsafe {
            gl::DeleteTextures(1, &self.texture_id);
        }
    }
}