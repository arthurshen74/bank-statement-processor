import { useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';

import { routerData } from '../routes';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = routerData[1].children
    .filter((r) => r.icon)
    .map((r) => ({
      name: r.name,
      href: r.path,
      icon: r.icon,
      children: r.children?.map((child) => ({
        name: child.name,
        href: `${r.path}/${child.path}`,
        icon: child.icon,
      })),
      current: location.pathname === r.path,
    }));

  // Update the current navigation item and children based on the current path
  const updatedNavigation = navigation.map((item) => {
    const isCurrent = location.pathname === item.href;
    let children = item.children;
    if (children) {
      children = children.map((child) => ({
        ...child,
        current: location.pathname === child.href,
      }));
    }
    // If any child is current, parent is also current
    const isAnyChildCurrent =
      children && children.some((child) => child.current);
    return {
      ...item,
      current: isCurrent || isAnyChildCurrent,
      children,
    };
  });

  return (
    <>
      <div>
        <Sidebar
          navigation={updatedNavigation}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="lg:pl-72 min-h-screen h-full ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-300/20">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden top-0 z-40"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>

          <main className="py-2">
            <div className="px-2 max-h-full overflow-y-auto">
              {/* This is where child routes will be rendered */}
              <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
