import { PageContainer } from '../components/layout/PageContainer';
import { Grid, Image, Box, Video } from 'lucide-react';

const assetTypes = [
  { name: 'All Assets', icon: Grid },
  { name: 'Images', icon: Image },
  { name: 'Models', icon: Box },
  { name: 'Animations', icon: Video },
];

export default function Assets() {
  return (
    <PageContainer title="Asset Manager">
      <div className="flex space-x-4 mb-6">
        {assetTypes.map((type) => (
          <button
            key={type.name}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2"
          >
            <type.icon className="w-5 h-5" />
            <span>{type.name}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Asset grid will go here */}
        <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Upload Assets</span>
        </div>
      </div>
    </PageContainer>
  );
}