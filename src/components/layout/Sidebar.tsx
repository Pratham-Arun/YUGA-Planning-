import { Home, Code, Box, Play, Settings, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', icon: Home, path: '/' },
  { name: 'Code Editor', icon: Code, path: '/code' },
  { name: 'Assets', icon: Box, path: '/assets' },
  { name: 'Scene Editor', icon: Play, path: '/scene' },
  { name: 'Team', icon: Users, path: '/team' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-800 text-white">
      <div className="p-4">
        <h1 className="text-xl font-bold">YUGA Engine</h1>
      </div>
      <nav className="mt-8">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm ${
                isActive
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}