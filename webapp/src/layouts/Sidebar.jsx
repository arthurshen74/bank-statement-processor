import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  TransitionChild,
} from '@headlessui/react';
import { Link } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Navigation from './Navigation';
import { Heading } from '../ui/heading';

export default function Sidebar({ navigation, sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {/* Mobile sidebar */}
      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className="relative z-50 lg:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>
            <div className="flex grow flex-col gap-y-3 overflow-y-auto bg-blue-600 px-6 py-4">
              <div className="text-white text-lg font-semibold">
                <Link to="">Familie Shen EÜR</Link>
              </div>
              <Navigation
                navigation={navigation}
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Desktop static sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-2 overflow-y-auto bg-blue-600 px-6 py-4">
          <div className="text-white text-lg font-semibold">
            <Link to="">Familie Shen EÜR</Link>
          </div>
          <Navigation navigation={navigation} />
        </div>
      </div>
    </>
  );
}
