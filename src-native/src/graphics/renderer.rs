use crate::graphics::{GraphicsContext, GraphicsResult, Vertex, ShaderProgram, VertexBuffer, Texture};
use std::sync::Arc;

/// Basic renderer implementation
pub struct Renderer {
    context: GraphicsContext,
    default_shader: Arc<ShaderProgram>,
}

impl Renderer {
    /// Create a new renderer with the given window context
    pub fn new(window: glutin::WindowedContext<glutin::NotCurrent>) -> GraphicsResult<Self> {
        let mut context = GraphicsContext::new(window)?;

        // Create default shader
        let default_shader = context.create_shader(
            "default",
            include_str!("shaders/default.vert"),
            include_str!("shaders/default.frag"),
        )?;

        Ok(Self {
            context,
            default_shader,
        })
    }

    /// Begin a new frame
    pub fn begin_frame(&mut self, clear_color: [f32; 4]) {
        self.context.clear(
            clear_color[0],
            clear_color[1],
            clear_color[2],
            clear_color[3],
        );
    }

    /// End the current frame
    pub fn end_frame(&mut self) -> GraphicsResult<()> {
        self.context.swap_buffers()
    }

    /// Draw a mesh with the given transform
    pub fn draw_mesh(
        &mut self,
        vertices: &[Vertex],
        transform: [f32; 16],
        texture: Option<&Texture>,
    ) -> GraphicsResult<()> {
        let vertex_buffer = VertexBuffer::new(vertices)?;
        
        self.context.use_shader(Arc::clone(&self.default_shader));
        
        // Set transform
        self.default_shader.set_mat4("transform", &transform);

        // Bind texture if provided
        if let Some(tex) = texture {
            tex.bind(0);
            self.default_shader.set_float("use_texture", 1.0);
        } else {
            self.default_shader.set_float("use_texture", 0.0);
        }

        vertex_buffer.draw();

        Ok(())
    }
}