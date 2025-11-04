import React from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface DebugStatsProps {
  stats: {
    activeParticles: number;
    frameTime: number;
    emissionRate: number;
  };
}

export const ParticleDebugStats = ({ stats }: DebugStatsProps) => {
  return (
    <Html position={[10, 10, 0]}>
      <div className="bg-black/80 text-white p-2 rounded text-sm font-mono">
        <div>Active Particles: {stats.activeParticles}</div>
        <div>Frame Time: {stats.frameTime.toFixed(2)}ms</div>
        <div>Emission Rate: {stats.emissionRate}/s</div>
      </div>
    </Html>
  );
};

interface ForceVisualizerProps {
  config: {
    forces?: Array<{
      type: string;
      params: any;
    }>;
  };
}

export const ForceVisualizer = ({ config }: ForceVisualizerProps) => {
  if (!config.forces) return null;

  return (
    <>
      {config.forces.map((force, index) => {
        switch (force.type) {
          case 'gravity':
            return (
              <arrowHelper
                key={`gravity-${index}`}
                args={[
                  new THREE.Vector3(0, Math.sign(force.params.strength), 0),
                  new THREE.Vector3(0, 0, 0),
                  Math.abs(force.params.strength),
                  0xff0000
                ]}
              />
            );
          case 'wind':
            return (
              <arrowHelper
                key={`wind-${index}`}
                args={[
                  force.params.direction.normalize(),
                  new THREE.Vector3(0, 0, 0),
                  force.params.strength,
                  0x00ff00
                ]}
              />
            );
          case 'vortex':
            return (
              <group key={`vortex-${index}`}>
                <mesh position={force.params.center}>
                  <torusGeometry args={[force.params.strength, 0.02, 16, 32]} />
                  <meshBasicMaterial color={0xff00ff} wireframe />
                </mesh>
                <arrowHelper
                  args={[
                    force.params.axis,
                    force.params.center,
                    1,
                    0xff00ff
                  ]}
                />
              </group>
            );
          case 'attractor':
            return (
              <mesh key={`attractor-${index}`} position={force.params.position}>
                <sphereGeometry args={[force.params.minDistance, 8, 8]} />
                <meshBasicMaterial color={0x0000ff} wireframe />
              </mesh>
            );
          default:
            return null;
        }
      })}
    </>
  );
};