import { createContext, useContext, useEffect, useState } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

// Core ECS Types
export type Entity = string;
export type ComponentData = Record<string, any>;
export type SystemFn = (world: World) => void;

export interface Component {
  type: string;
  data: ComponentData;
}

export interface World {
  entities: Map<Entity, Set<Component>>;
  systems: SystemFn[];
}

// Create initial world state
const createWorld = (): World => ({
  entities: new Map(),
  systems: [],
});

// Core ECS operations
export const addEntity = (world: World, components: Component[] = []): Entity => {
  const entity = uuidv4();
  world.entities.set(entity, new Set(components));
  return entity;
};

export const addComponent = (world: World, entity: Entity, component: Component) => {
  const components = world.entities.get(entity);
  if (components) {
    components.add(component);
  }
};

export const removeComponent = (world: World, entity: Entity, componentType: string) => {
  const components = world.entities.get(entity);
  if (components) {
    for (const component of components) {
      if (component.type === componentType) {
        components.delete(component);
        break;
      }
    }
  }
};

export const getComponent = (world: World, entity: Entity, componentType: string): Component | undefined => {
  const components = world.entities.get(entity);
  if (components) {
    for (const component of components) {
      if (component.type === componentType) {
        return component;
      }
    }
  }
  return undefined;
};

// Create ECS context
const WorldContext = createContext<World | null>(null);

export const WorldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [world] = useState(() => createWorld());

  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      // Run all systems
      world.systems.forEach(system => system(world));
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [world]);

  return (
    <WorldContext.Provider value={world}>
      {children}
    </WorldContext.Provider>
  );
};

export const useWorld = () => {
  const world = useContext(WorldContext);
  if (!world) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return world;
};