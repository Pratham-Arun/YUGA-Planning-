import { Component, ComponentData } from './world';

// Component Registry for type safety and serialization
export interface ComponentRegistry {
  [key: string]: {
    create: (data: ComponentData) => Component;
    serialize: (component: Component) => ComponentData;
    deserialize: (data: ComponentData) => Component;
  };
}

const registry: ComponentRegistry = {};

// Base components
export const TransformComponent = {
  type: 'transform',
  create: (data: ComponentData = {}) => ({
    type: 'transform',
    data: {
      position: data.position || { x: 0, y: 0, z: 0 },
      rotation: data.rotation || { x: 0, y: 0, z: 0 },
      scale: data.scale || { x: 1, y: 1, z: 1 },
    },
  }),
  serialize: (component: Component) => component.data,
  deserialize: (data: ComponentData) => TransformComponent.create(data),
};

export const RenderComponent = {
  type: 'render',
  create: (data: ComponentData = {}) => ({
    type: 'render',
    data: {
      mesh: data.mesh || 'default',
      material: data.material || 'default',
      visible: data.visible !== undefined ? data.visible : true,
    },
  }),
  serialize: (component: Component) => component.data,
  deserialize: (data: ComponentData) => RenderComponent.create(data),
};

export const ScriptComponent = {
  type: 'script',
  create: (data: ComponentData = {}) => ({
    type: 'script',
    data: {
      source: data.source || '',
      enabled: data.enabled !== undefined ? data.enabled : true,
    },
  }),
  serialize: (component: Component) => component.data,
  deserialize: (data: ComponentData) => ScriptComponent.create(data),
};

// Register base components
registry[TransformComponent.type] = TransformComponent;
registry[RenderComponent.type] = RenderComponent;
registry[ScriptComponent.type] = ScriptComponent;

export const registerComponent = (
  type: string,
  create: (data: ComponentData) => Component,
  serialize: (component: Component) => ComponentData,
  deserialize: (data: ComponentData) => Component
) => {
  registry[type] = { create, serialize, deserialize };
};

export const getComponentDefinition = (type: string) => {
  return registry[type];
};

export default registry;