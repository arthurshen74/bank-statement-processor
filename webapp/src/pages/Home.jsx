import React from 'react';
import { Link } from 'react-router-dom';
import { routerData } from '../routes';
import { HomeIcon } from '@heroicons/react/24/outline';
import { Heading } from '../ui/heading';

const Home = () => {
  return (
    <div className="p-2 max-w-7xl mx-auto space-y-6">
      <Heading>Familie Shen EÜR</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 rounded-lg">
        {routerData[1].children
          .filter((route) => !route.index)
          .filter((route) => route.icon)
          .filter((route) => route.element)
          .map((route, idx) => {
            const LinkIcon = route.icon;
            return (
              <Link
                to={route.path}
                className="block self-stretch justify-self-stretch h-full w-full"
                key={idx}
              >
                <div className="h-full rounded-lg shadow-lg p-6 hover:shadow-xl shadow-gray-600 transition-shadow border border-gray-400 dark:border-gray-200 flex flex-col justify-start align-stretch">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4 dark:bg-blue-900 dark:text-blue-300">
                    <LinkIcon className="h-8 w-8" />
                  </div>
                  <Heading className="text-center" level={3}>
                    {route.name}
                  </Heading>
                  <div className="text-gray-600 dark:text-gray-300 text-center">
                    {route.description}
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
};

export default Home;
