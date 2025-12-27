import React, { useState, useContext } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { AuthContext } from '../contexts/AuthContext';


interface NavItemProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

interface HorizontalSidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, active, onClick }) => {
  return (
    <li
      onClick={onClick}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
        active
          ? 'bg-blue-50 text-blue-600 font-semibold'
          : 'text-gray-600 hover:bg-gray-100'
      } lg:p-0 lg:bg-transparent`}
    >
      <span className="ml-3 lg:ml-0">{label}</span>
    </li>
  );
};

const HorizontalSidebar: React.FC<HorizontalSidebarProps> = ({ activeItem, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Envanter', label: 'Envanter' },
    { id: 'Self Service', label: 'Self Service' },
    { id: 'Ansible', label: 'Ansible' },
    { id: 'Performance', label: 'Performance' },
    { id: 'AskGT', label: 'AskGT' },
    { id: 'Nöbet Listesi', label: 'Nöbet Listesi' },
    { id: 'Önemli Linkler', label: 'Önemli Linkler' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">BMW Portal</h1>
          </div>

          <nav className="hidden lg:flex flex-1 justify-center">
            <ul className="flex items-center space-x-6 xl:space-x-8">
              {navItems.map((item) => (
                 <a href="#" key={item.id} className={`text-sm font-medium transition-colors duration-200 ${activeItem === item.id ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-900'}`} onClick={(e) => { e.preventDefault(); onNavigate(item.id); }}>
                    {item.label}
                 </a>
              ))}
            </ul>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                    <img
                        src="https://picsum.photos/seed/user-avatar/40/40"
                        alt="User Avatar"
                        className="h-9 w-9 rounded-full"
                    />
                    <p className="font-semibold text-sm text-gray-700 capitalize">{user?.username}</p>
                </div>
                 <button onClick={logout} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200" title="Logout">
                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </button>
            </div>
             <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200">
           <nav className="p-4">
             <ul>
               {navItems.map((item) => (
                 <NavItem
                   key={item.id}
                   label={item.label}
                   active={activeItem === item.id}
                   onClick={() => { onNavigate(item.id); setIsMenuOpen(false); }}
                 />
               ))}
                <li className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                             <img
                                src="https://picsum.photos/seed/user-avatar/40/40"
                                alt="User Avatar"
                                className="h-9 w-9 rounded-full"
                             />
                             <p className="font-semibold text-sm text-gray-700 capitalize">{user?.username}</p>
                         </div>
                         <button onClick={logout} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200" title="Logout">
                            <ArrowRightOnRectangleIcon className="h-6 w-6" />
                        </button>
                    </div>
                </li>
             </ul>
           </nav>
        </div>
      )}
    </header>
  );
};

export default HorizontalSidebar;