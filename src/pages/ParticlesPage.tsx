import React from 'react';
import ParticleSystemDemo from '../components/ParticleSystem/ParticleSystemDemo';

export default function ParticlesPage() {
  return (
    <div className="w-full h-full bg-gray-900">
      <div className="absolute top-4 left-4 z-10 text-white">
        <h1 className="text-2xl font-bold mb-2">Particle System Demo</h1>
        <p className="text-sm opacity-70">
          Demonstrating GPU-accelerated particle effects
        </p>
      </div>
      <ParticleSystemDemo />
    </div>
  );
}