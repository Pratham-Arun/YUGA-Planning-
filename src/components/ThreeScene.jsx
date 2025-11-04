import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { useThree } from '../hooks/useThree';
import { useProject } from '../contexts/ProjectContext';

export default function ThreeScene() {
    const containerRef = useRef();
    const { scene, camera, renderer, controls } = useThree();
    const { activeScene, selectedObject, setSelectedObject } = useProject();

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Three.js scene
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Camera setup
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);

        // Renderer setup
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);

        // Controls setup
        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;

        // Transform controls for object manipulation
        const transformControls = new TransformControls(camera, renderer.domElement);
        transformControls.addEventListener('dragging-changed', (event) => {
            orbitControls.enabled = !event.value;
        });
        scene.add(transformControls);

        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20);
        scene.add(gridHelper);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        // Directional light with shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        // Animation loop
        let animationFrameId;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            orbitControls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle window resize
        const handleResize = () => {
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            transformControls.dispose();
            orbitControls.dispose();
            renderer.dispose();
            if (containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, [camera, renderer, scene]);

    // Update scene when activeScene changes
    useEffect(() => {
        if (!activeScene) return;

        // Clear existing objects
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }

        // Load scene objects
        activeScene.objects.forEach(obj => {
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshStandardMaterial({ color: obj.color || 0x808080 });
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
            mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
            mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            scene.add(mesh);
        });
    }, [activeScene, scene]);

    // Handle object selection
    const handleClick = (event) => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        mouse.x = (event.clientX / containerRef.current.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / containerRef.current.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            setSelectedObject(object);
            controls.attach(object);
        } else {
            setSelectedObject(null);
            controls.detach();
        }
    };

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full"
            onClick={handleClick}
        />
    );
}