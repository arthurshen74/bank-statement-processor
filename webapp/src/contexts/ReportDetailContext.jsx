import { createContext, useContext } from 'react';

/**
 * Context for sharing state and handlers between ReportDetail and its child views
 * (TransactionView and ReportView)
 */
const ReportDetailContext = createContext(null);

/**
 * Custom hook to access the ReportDetail context
 * Throws error if used outside of provider
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useReportDetailContext = () => {
  const context = useContext(ReportDetailContext);
  if (!context) {
    throw new Error(
      'useReportDetailContext must be used within ReportDetailProvider'
    );
  }
  return context;
};

/**
 * Provider component that wraps child components and provides shared state
 */
export const ReportDetailProvider = ({ children, value }) => {
  return (
    <ReportDetailContext.Provider value={value}>
      {children}
    </ReportDetailContext.Provider>
  );
};
