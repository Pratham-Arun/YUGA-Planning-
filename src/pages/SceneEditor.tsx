import { PageContainer } from '../components/layout/PageContainer';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function SceneEditor() {
  return (
    <PageContainer title="Scene Editor">
      <div className="h-[calc(100vh-12rem)] rounded-lg overflow-hidden bg-black">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
          <OrbitControls />
        </Canvas>
      </div>
    </PageContainer>
  );
}