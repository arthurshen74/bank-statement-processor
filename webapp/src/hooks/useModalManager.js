import { useState, useCallback } from 'react';

/**
 * Hook to centralize modal state management
 * Replaces multiple boolean states with a single object
 * @param {Array<string>} modalNames - Array of modal identifiers
 * @returns {Object} Modal state and control functions
 */
export const useModalManager = (modalNames = []) => {
  const [openModals, setOpenModals] = useState(() => {
    // Initialize all modals as closed
    return modalNames.reduce((acc, name) => {
      acc[name] = false;
      return acc;
    }, {});
  });

  const [modalData, setModalData] = useState({});

  /**
   * Open a modal, optionally with associated data
   */
  const open = useCallback((modalName, data = null) => {
    setOpenModals((prev) => ({ ...prev, [modalName]: true }));
    if (data !== null) {
      setModalData((prev) => ({ ...prev, [modalName]: data }));
    }
  }, []);

  /**
   * Close a modal and clear its associated data
   */
  const close = useCallback((modalName) => {
    setOpenModals((prev) => ({ ...prev, [modalName]: false }));
    setModalData((prev) => {
      const newData = { ...prev };
      delete newData[modalName];
      return newData;
    });
  }, []);

  /**
   * Toggle a modal's state
   */
  const toggle = useCallback((modalName, data = null) => {
    setOpenModals((prev) => {
      const isOpen = !prev[modalName];
      if (isOpen && data !== null) {
        setModalData((prevData) => ({ ...prevData, [modalName]: data }));
      } else if (!isOpen) {
        setModalData((prevData) => {
          const newData = { ...prevData };
          delete newData[modalName];
          return newData;
        });
      }
      return { ...prev, [modalName]: isOpen };
    });
  }, []);

  /**
   * Check if a modal is open
   */
  const isOpen = useCallback((modalName) => {
    return openModals[modalName] || false;
  }, [openModals]);

  /**
   * Get data associated with a modal
   */
  const getData = useCallback((modalName) => {
    return modalData[modalName] || null;
  }, [modalData]);

  /**
   * Close all modals
   */
  const closeAll = useCallback(() => {
    setOpenModals(
      modalNames.reduce((acc, name) => {
        acc[name] = false;
        return acc;
      }, {})
    );
    setModalData({});
  }, [modalNames]);

  return {
    open,
    close,
    toggle,
    isOpen,
    getData,
    closeAll,
    // Expose raw state for debugging if needed
    openModals,
  };
};
