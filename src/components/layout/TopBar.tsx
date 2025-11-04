import { Bell, User } from 'lucide-react';

export function TopBar() {
  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h2 className="text-white text-lg font-semibold">Project Name</h2>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-gray-400 hover:text-white">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-gray-400 hover:text-white">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}