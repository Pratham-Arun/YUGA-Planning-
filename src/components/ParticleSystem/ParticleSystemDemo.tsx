import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParticleSystem from './ParticleSystem';
import { ParticleDebugStats, ForceVisualizer } from './ParticleDebug';
import * as THREE from 'three';

// Particle effect configurations
type ForceType = 'gravity' | 'wind' | 'vortex' | 'attractor';

interface ParticleForce {
  type: ForceType;
  params: any;
}

interface ParticleConfig {
  maxParticles: number;
  emissionRate: number;
  lifetime: { min: number; max: number };
  initialVelocity: { min: THREE.Vector3; max: THREE.Vector3 };
  initialSize: { min: number; max: number };
  colors: THREE.Color[];
  forces?: ParticleForce[];
}

const ParticleEffects: Record<string, ParticleConfig> = {
  fire: {
    maxParticles: 1000,
    emissionRate: 100,
    lifetime: { min: 0.5, max: 1.5 },
    initialVelocity: {
      min: new THREE.Vector3(-0.2, 0.5, -0.2),
      max: new THREE.Vector3(0.2, 2.0, 0.2),
    },
    initialSize: { min: 0.1, max: 0.3 },
    colors: [
      new THREE.Color(1, 0.3, 0),  // Orange
      new THREE.Color(1, 0.1, 0),  // Red
      new THREE.Color(1, 0.5, 0),  // Light orange
    ],
    forces: [
      { type: 'gravity', params: { strength: 1 } },
      { type: 'wind', params: { direction: new THREE.Vector3(0, 1, 0), strength: 0.5 } }
    ]
  },

  smoke: {
    maxParticles: 500,
    emissionRate: 30,
    lifetime: { min: 2.0, max: 4.0 },
    initialVelocity: {
      min: new THREE.Vector3(-0.1, 0.2, -0.1),
      max: new THREE.Vector3(0.1, 0.4, 0.1),
    },
    initialSize: { min: 0.3, max: 0.6 },
    colors: [
      new THREE.Color(0.2, 0.2, 0.2),  // Dark grey
      new THREE.Color(0.4, 0.4, 0.4),  // Medium grey
      new THREE.Color(0.6, 0.6, 0.6),  // Light grey
    ],
    forces: [
      { type: 'wind', params: { direction: new THREE.Vector3(0.2, 0.1, 0), strength: 0.2 } },
      { 
        type: 'vortex', 
        params: { 
          center: new THREE.Vector3(0, 0, 0),
          axis: new THREE.Vector3(0, 1, 0),
          strength: 0.2 
        } 
      }
    ]
  },

  magic: {
    maxParticles: 300,
    emissionRate: 30,
    lifetime: { min: 1.0, max: 2.0 },
    initialVelocity: {
      min: new THREE.Vector3(-0.3, 0.0, -0.3),
      max: new THREE.Vector3(0.3, 0.0, 0.3),
    },
    initialSize: { min: 0.1, max: 0.2 },
    colors: [
      new THREE.Color(0.5, 0.0, 1.0),  // Purple
      new THREE.Color(0.7, 0.3, 1.0),  // Bright purple
      new THREE.Color(0.3, 0.9, 1.0),  // Cyan
      new THREE.Color(0.0, 0.5, 1.0),  // Blue
    ],
    forces: [
      { 
        type: 'attractor', 
        params: { 
          position: new THREE.Vector3(0, 0, 0),
          strength: 1.0,
          minDistance: 0.5 
        } 
      },
      { 
        type: 'vortex', 
        params: { 
          center: new THREE.Vector3(0, 0, 0),
          axis: new THREE.Vector3(0, 1, 0),
          strength: 0.5 
        } 
      }
    ]
  },

  explosion: {
    maxParticles: 2000,
    emissionRate: 2000,  // Burst emission
    lifetime: { min: 0.5, max: 1.5 },
    initialVelocity: {
      min: new THREE.Vector3(-5.0, -5.0, -5.0),
      max: new THREE.Vector3(5.0, 5.0, 5.0),
    },
    initialSize: { min: 0.2, max: 0.4 },
    colors: [
      new THREE.Color(1.0, 0.8, 0.3),  // Bright yellow
      new THREE.Color(1.0, 0.4, 0.0),  // Orange
      new THREE.Color(0.7, 0.0, 0.0),  // Red
      new THREE.Color(0.3, 0.3, 0.3),  // Smoke
    ],
    forces: [
      { type: 'gravity', params: { strength: -2.0 } }
    ]
  }
};

interface ParticleSystemDemoProps {
  effect?: keyof typeof ParticleEffects;
  debug?: boolean;
}

export const ParticleSystemDemo = ({ effect = 'fire', debug = false }: ParticleSystemDemoProps) => {
  const [stats, setStats] = useState({
    activeParticles: 0,
    frameTime: 0,
    emissionRate: 0
  });

  const currentConfig = ParticleEffects[effect];

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 2, 5] }}
        style={{ background: '#000000' }}
      >
        <ambientLight intensity={0.5} />
        <ParticleSystem
          config={currentConfig}
          position={new THREE.Vector3(0, 0, 0)}
          debug={debug}
          onStatsUpdate={setStats}
        />
        {debug && (
          <>
            <gridHelper args={[10, 10]} />
            <axesHelper args={[5]} />
            <ForceVisualizer config={currentConfig} />
            <ParticleDebugStats stats={stats} />
          </>
        )}
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default ParticleSystemDemo;