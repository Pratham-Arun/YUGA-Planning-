import { PageContainer } from '../components/layout/PageContainer';

export default function Team() {
  return (
    <PageContainer title="Team">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Team member cards will go here */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white">Invite Team Members</h3>
        </div>
      </div>
    </PageContainer>
  );
}