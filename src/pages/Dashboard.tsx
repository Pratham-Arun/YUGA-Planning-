import { PageContainer } from '../components/layout/PageContainer';

export default function Dashboard() {
  return (
    <PageContainer title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Project cards will go here */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white">AI Activity</h3>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        </div>
      </div>
    </PageContainer>
  );
}