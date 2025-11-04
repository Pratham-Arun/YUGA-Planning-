import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export function useThree() {
    const scene = useMemo(() => new THREE.Scene(), []);
    const camera = useMemo(() => new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000), []);
    const renderer = useMemo(() => new THREE.WebGLRenderer({ antialias: true }), []);
    const controls = useMemo(() => new THREE.Object3D(), []); // Placeholder for transform controls

    useEffect(() => {
        // Set default background color
        scene.background = new THREE.Color(0x1a1a1a);

        // Cleanup
        return () => {
            scene.clear();
            renderer.dispose();
        };
    }, [scene, renderer]);

    return { scene, camera, renderer, controls };
}