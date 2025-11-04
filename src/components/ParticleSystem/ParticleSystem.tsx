import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  config: {
    maxParticles: number;
    emissionRate: number;
    lifetime: { min: number; max: number };
    initialVelocity: { min: THREE.Vector3; max: THREE.Vector3 };
    initialSize: { min: number; max: number };
    colors: THREE.Color[];
    forces?: Array<{
      type: 'gravity' | 'wind' | 'vortex' | 'attractor';
      params: any;
    }>;
  };
  position: THREE.Vector3;
  debug?: boolean;
  onStatsUpdate?: (stats: {
    activeParticles: number;
    frameTime: number;
    emissionRate: number;
  }) => void;
}

const ParticleSystem = ({ config, position, debug, onStatsUpdate }: ParticleSystemProps) => {
  const { scene } = useThree();
  const particlesRef = useRef<THREE.Points>();
  const geometryRef = useRef<THREE.BufferGeometry>();
  const materialRef = useRef<THREE.ShaderMaterial>();
  const particleSystemState = useRef({
    particles: [] as any[],
    time: 0,
    nextParticleIndex: 0,
  });

  useEffect(() => {
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.maxParticles * 3);
    const sizes = new Float32Array(config.maxParticles);
    const colors = new Float32Array(config.maxParticles * 3);
    const lifetimes = new Float32Array(config.maxParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float lifetime;
        uniform float time;
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vColor = color;
          float age = time - lifetime;
          float normalizedAge = age / 2.0; // 2.0 is max lifetime
          vAlpha = 1.0 - normalizedAge;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float r = length(gl_PointCoord - vec2(0.5));
          if (r > 0.5) discard;
          
          gl_FragColor = vec4(vColor, vAlpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    // Create points
    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    scene.add(points);

    // Store refs
    geometryRef.current = geometry;
    materialRef.current = material;
    particlesRef.current = points;

    return () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, config, position]);

  useFrame((state, delta) => {
    if (!geometryRef.current || !materialRef.current || !particlesRef.current) return;

    const time = state.clock.getElapsedTime();
    particleSystemState.current.time = time;
    materialRef.current.uniforms.time.value = time;

    // Performance tracking for debug mode
    const startTime = performance.now();
    let activeParticles = 0;

    // Emit new particles
    const particlesToEmit = Math.floor(config.emissionRate * delta);
    for (let i = 0; i < particlesToEmit; i++) {
      if (particleSystemState.current.nextParticleIndex >= config.maxParticles) {
        particleSystemState.current.nextParticleIndex = 0;
      }

      const index = particleSystemState.current.nextParticleIndex;
      const positions = geometryRef.current.attributes.position.array as Float32Array;
      const sizes = geometryRef.current.attributes.size.array as Float32Array;
      const colors = geometryRef.current.attributes.color.array as Float32Array;
      const lifetimes = geometryRef.current.attributes.lifetime.array as Float32Array;

      // Initialize particle
      positions[index * 3] = 0;
      positions[index * 3 + 1] = 0;
      positions[index * 3 + 2] = 0;

      // Random velocity with improved spread
      const velocity = new THREE.Vector3(
        THREE.MathUtils.randFloat(config.initialVelocity.min.x, config.initialVelocity.max.x),
        THREE.MathUtils.randFloat(config.initialVelocity.min.y, config.initialVelocity.max.y),
        THREE.MathUtils.randFloat(config.initialVelocity.min.z, config.initialVelocity.max.z)
      );

      // Store particle data with enhanced properties
      particleSystemState.current.particles[index] = {
        velocity,
        birthTime: time,
        lifetime: THREE.MathUtils.randFloat(config.lifetime.min, config.lifetime.max),
        initialSize: THREE.MathUtils.randFloat(config.initialSize.min, config.initialSize.max),
        age: 0,
      };

      // Initialize with first color
      const color = config.colors[0];
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;

      sizes[index] = particleSystemState.current.particles[index].initialSize;
      lifetimes[index] = time;

      particleSystemState.current.nextParticleIndex++;
      activeParticles++;
    }

    // Update existing particles with forces
    for (let i = 0; i < config.maxParticles; i++) {
      const particle = particleSystemState.current.particles[i];
      if (!particle) continue;

      particle.age = time - particle.birthTime;
      if (particle.age > particle.lifetime) continue;

      const positions = geometryRef.current.attributes.position.array as Float32Array;
      const i3 = i * 3;
      const position = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      // Apply forces
      if (config.forces) {
        for (const force of config.forces) {
          switch (force.type) {
            case 'gravity':
              particle.velocity.y += force.params.strength * delta;
              break;
            case 'wind':
              particle.velocity.add(
                force.params.direction
                  .clone()
                  .multiplyScalar(force.params.strength * delta)
              );
              break;
            case 'vortex': {
              const toCenter = force.params.center.clone().sub(position);
              const distance = toCenter.length();
              const tangent = new THREE.Vector3()
                .crossVectors(force.params.axis, toCenter)
                .normalize();
              particle.velocity.add(
                tangent.multiplyScalar(
                  (force.params.strength * delta) / Math.max(distance, 0.1)
                )
              );
              break;
            }
            case 'attractor': {
              const toAttractor = force.params.position.clone().sub(position);
              const distance = toAttractor.length();
              if (distance > force.params.minDistance) {
                const strength =
                  (force.params.strength * delta) /
                  Math.max(distance * distance, 0.1);
                particle.velocity.add(
                  toAttractor.normalize().multiplyScalar(strength)
                );
              }
              break;
            }
          }
        }
      }

      // Update position
      positions[i3] += particle.velocity.x * delta;
      positions[i3 + 1] += particle.velocity.y * delta;
      positions[i3 + 2] += particle.velocity.z * delta;
    }

    // Update geometry attributes
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.size.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;
    geometryRef.current.attributes.lifetime.needsUpdate = true;

    // Update debug stats
    if (onStatsUpdate) {
      const endTime = performance.now();
      onStatsUpdate({
        activeParticles,
        frameTime: endTime - startTime,
        emissionRate: config.emissionRate
      });
    }
  });

  return null;
};

export default ParticleSystem;