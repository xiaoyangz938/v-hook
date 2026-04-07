import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function GlobalNav() {
  const location = useLocation();
  
  if (location.pathname === '/') {
    return null;
  }
  
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/v-hook', label: 'Docs', icon: BookOpen },
    { path: '/community', label: 'Community', icon: Users },
  ];

  return (
    <div className="fixed top-0 left-0 w-full z-[60] bg-[#1a1a1a] border-b border-gray-800 shadow-sm">
      <div className="flex items-center px-4 h-14 gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                isActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 bg-gray-800 rounded-md -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
