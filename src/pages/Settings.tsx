import { PageContainer } from '../components/layout/PageContainer';

export default function Settings() {
  return (
    <PageContainer title="Settings">
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">AI Configuration</h3>
          {/* AI settings form will go here */}
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Project Defaults</h3>
          {/* Project settings form will go here */}
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
          {/* Account settings form will go here */}
        </div>
      </div>
    </PageContainer>
  );
}