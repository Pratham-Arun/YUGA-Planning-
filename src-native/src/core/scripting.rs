use crate::core::subsystem::Subsystem;
use mlua::{Lua, Result as LuaResult, Table, Value};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

pub struct ScriptingSystem {
    lua: Lua,
    scripts: HashMap<u32, Script>,
    next_script_id: u32,
}

pub struct Script {
    id: u32,
    name: String,
    source: String,
    environment: Table<'static>,
}

impl ScriptingSystem {
    pub fn new() -> Self {
        Self {
            lua: Lua::new(),
            scripts: HashMap::new(),
            next_script_id: 1,
        }
    }

    pub fn load_script<P: AsRef<Path>>(&mut self, name: &str, path: P) -> LuaResult<u32> {
        let source = fs::read_to_string(path)?;
        self.create_script(name, &source)
    }

    pub fn create_script(&mut self, name: &str, source: &str) -> LuaResult<u32> {
        let script_id = self.next_script_id;
        self.next_script_id += 1;

        // Create a new environment for the script
        let globals = self.lua.globals();
        let env: Table = self.lua.create_table()?;
        
        // Add standard libraries to the environment
        env.set("print", globals.get::<_, Value>("print")?)?;
        env.set("math", globals.get::<_, Value>("math")?)?;
        env.set("string", globals.get::<_, Value>("string")?)?;
        env.set("table", globals.get::<_, Value>("table")?)?;

        // Add engine API to the environment
        self.register_api(&env)?;

        let script = Script {
            id: script_id,
            name: name.to_string(),
            source: source.to_string(),
            environment: env,
        };

        // Compile and run the script in its environment
        let chunk = self.lua.load(&script.source)
            .set_name(&script.name)?
            .set_environment(script.environment.clone())?;
        
        chunk.exec()?;

        self.scripts.insert(script_id, script);
        Ok(script_id)
    }

    pub fn call_function(&self, script_id: u32, name: &str, args: &[Value]) -> LuaResult<Value> {
        if let Some(script) = self.scripts.get(&script_id) {
            let func: mlua::Function = script.environment.get(name)?;
            func.call(args.to_vec())
        } else {
            Err(mlua::Error::RuntimeError(format!(
                "No script found with id {}",
                script_id
            )))
        }
    }

    fn register_api(&self, env: &Table) -> LuaResult<()> {
        // Register Vector3 type
        let vector3_mt = self.lua.create_table()?;
        vector3_mt.set(
            "new",
            self.lua.create_function(|_, (x, y, z): (f32, f32, f32)| {
                Ok([x, y, z])
            })?,
        )?;

        env.set("Vector3", vector3_mt)?;

        // Register Transform API
        let transform_api = self.lua.create_table()?;
        transform_api.set(
            "set_position",
            self.lua.create_function(|_, (entity_id, pos): (u32, [f32; 3])| {
                // TODO: Implement actual transform modification
                println!("Setting position of entity {} to {:?}", entity_id, pos);
                Ok(())
            })?,
        )?;

        env.set("Transform", transform_api)?;

        // Register Input API
        let input_api = self.lua.create_table()?;
        input_api.set(
            "is_key_pressed",
            self.lua.create_function(|_, key: String| {
                // TODO: Implement actual key checking
                Ok(false)
            })?,
        )?;

        env.set("Input", input_api)?;

        // Register Physics API
        let physics_api = self.lua.create_table()?;
        physics_api.set(
            "apply_force",
            self.lua.create_function(|_, (entity_id, force): (u32, [f32; 3])| {
                // TODO: Implement actual force application
                println!("Applying force {:?} to entity {}", force, entity_id);
                Ok(())
            })?,
        )?;

        env.set("Physics", physics_api)?;

        Ok(())
    }
}

impl Subsystem for ScriptingSystem {
    fn init(&mut self) -> Result<(), String> {
        Ok(())
    }

    fn update(&mut self, delta_time: f32) -> Result<(), String> {
        for script in self.scripts.values() {
            if let Ok(update_fn) = script.environment.get::<_, mlua::Function>("update") {
                if let Err(e) = update_fn.call::<_, ()>(delta_time) {
                    eprintln!("Error in script {}: {}", script.name, e);
                }
            }
        }
        Ok(())
    }

    fn shutdown(&mut self) -> Result<(), String> {
        self.scripts.clear();
        Ok(())
    }
}