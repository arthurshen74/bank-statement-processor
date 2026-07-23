import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useLocation } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  DropdownMenu,
} from '../ui/dropdown';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';

export default function Navigation({ navigation, onNavigate }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [expandItem, setExpandItem] = useState(null);

  // normalize location.pathname by removing initial slash
  const currentPath = useMemo(
    () =>
      location.pathname.startsWith('/')
        ? location.pathname.slice(1)
        : location.pathname,
    [location.pathname]
  );

  const expandableItems = useMemo(() => {
    return navigation.filter(
      (item) => item.children && item.children.length > 0
    );
  }, [navigation]);

  useEffect(() => {
    if (!currentPath) {
      setExpandItem(null);
      return;
    }
    for (const item of expandableItems) {
      if (item.href === currentPath) {
        setExpandItem((prev) => {
          if (prev === item.name) {
            return null;
          }
          return item.name;
        });
        return;
      }
      if (item.children.some((child) => child.href === currentPath)) {
        setExpandItem(item.name);
        return;
      }
    }
  }, [currentPath, expandableItems]);

  return (
    <>
      <nav className="flex flex-1 flex-col justify-between">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isExpandable = item.children && item.children.length > 0;
                const LinkElement = isExpandable ? 'div' : Link;
                const LinkProps = isExpandable
                  ? {
                      onClick: (e) => {
                        e.preventDefault();
                        setExpandItem((prev) => {
                          if (prev === item.name) {
                            return null;
                          }
                          return item.name;
                        });
                      },
                    }
                  : {
                      to: item.href,
                      onClick: onNavigate,
                    };
                return (
                  <li key={item.name}>
                    <LinkElement
                      {...LinkProps}
                      className={clsx(
                        `${item.href ? item.href : ''}` === currentPath
                          ? 'bg-blue-700 text-white'
                          : 'text-blue-200 hover:bg-blue-700 hover:text-white',
                        'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold justify-between items-center cursor-pointer'
                      )}
                    >
                      <div className="flex gap-2">
                        <item.icon
                          aria-hidden="true"
                          className={clsx(
                            item.current
                              ? 'text-white'
                              : 'text-blue-200 group-hover:text-white',
                            'size-6 shrink-0'
                          )}
                        />
                        <div>{item.name}</div>
                      </div>
                      {item.children && item.children.length > 0 && (
                        <div className="p-1 rounded-full hover:bg-blue-600 group-hover:bg-blue-600 cursor-pointer">
                          <ChevronDownIcon
                            className={clsx(
                              'size-5 transition-transform duration-300',
                              expandItem === item.name ? 'rotate-180' : ''
                            )}
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </LinkElement>
                    {item.children && expandItem === item.name && (
                      <ul className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              to={child.href}
                              className={clsx(
                                child.href === currentPath
                                  ? 'bg-blue-700 text-white'
                                  : 'text-blue-200 hover:bg-blue-700 hover:text-white',
                                'group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold'
                              )}
                              onClick={onNavigate}
                            >
                              <child.icon
                                aria-hidden="true"
                                className={clsx(
                                  child.current
                                    ? 'text-white'
                                    : 'text-blue-200 group-hover:text-white',
                                  'size-6 shrink-0'
                                )}
                              />
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="-mx-6 mt-auto">
            <Dropdown>
              <DropdownButton plain className="w-full cursor-pointer">
                <div className="w-full flex items-center justify-between px-2 py-1">
                  <div className="rounded-full size-10 bg-gray-600 text-white text-lg font-semibold flex items-center justify-center">
                    <span>
                      {`${user?.firstName?.charAt(0) || ''}${
                        user?.lastName?.charAt(0) || ''
                      }`}
                    </span>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-sm/6 font-semibold text-gray-900 hover:bg-gray-50
                  dark:text-white dark:hover:bg-white/5"
                  >{`${user?.firstName || ''} ${user?.lastName || ''}`}</span>
                  <EllipsisVerticalIcon className="size-8 stroke-2 text-white" />
                </div>
              </DropdownButton>
              <DropdownMenu
                anchor="top right"
                className="z-50 min-w-(--button-width) -transform-x-2"
              >
                <DropdownHeader>
                  <div className="pr-6">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Signed in as
                    </div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-white">
                      @{user?.userName || ''}
                    </div>
                  </div>
                </DropdownHeader>
                <DropdownDivider />
                <DropdownItem onClick={logout} className="cursor-pointer">
                  Sign Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </li>
        </ul>
      </nav>
    </>
  );
}
