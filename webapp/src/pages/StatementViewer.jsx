import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStatementById } from '../api/statements';
import { adaptMongoStatementsToResults } from '../utils/statementAdapter';
import TransactionResults from '../components/TransactionResults';
import { Heading } from '../ui/heading';
import { Button } from '../ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * StatementViewer component that displays selected statements using TransactionResults.
 * Receives statement IDs via React Router location state, fetches the full statement data,
 * and transforms it for display.
 */
function StatementViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
  });

  // Get statement IDs from location state
  const statementIds = useMemo(
    () => location.state?.statementIds || [],
    [location.state]
  );

  useEffect(() => {
    const fetchStatements = async () => {
      if (statementIds.length === 0) {
        setError('No statements selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setLoadingProgress({ current: 0, total: statementIds.length });

        // Fetch statements sequentially with progress updates
        const statements = [];
        for (let i = 0; i < statementIds.length; i++) {
          setLoadingProgress({ current: i + 1, total: statementIds.length });

          try {
            const statement = await getStatementById(statementIds[i]);
            if (statement) {
              statements.push(statement);
            }
          } catch (err) {
            console.error(`Failed to fetch statement ${statementIds[i]}:`, err);
            // Continue fetching other statements even if one fails
          }
        }

        if (statements.length === 0) {
          setError('No statements could be loaded');
          setLoading(false);
          return;
        }

        // Transform MongoDB data to TransactionResults format
        const adaptedData = adaptMongoStatementsToResults(statements);
        setStatementData(adaptedData);
      } catch (err) {
        setError(err.message || 'Failed to load statements');
      } finally {
        setLoading(false);
      }
    };

    fetchStatements();
  }, [statementIds]);

  const handleBack = () => {
    navigate('/statements');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={handleBack} plain>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Statements
          </Button>
          <Heading>Loading Statements</Heading>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading statement {loadingProgress.current} of{' '}
            {loadingProgress.total}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={handleBack} plain>
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Statements
          </Button>
          <Heading>Error</Heading>
        </div>
        <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-800 dark:text-red-400 font-medium">
            Failed to load statements
          </p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</p>
          <Button onClick={handleBack} className="mt-4">
            Return to Statements
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={handleBack} plain>
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Statements
        </Button>
      </div>
      {statementData && <TransactionResults results={statementData} />}
    </div>
  );
}

export default StatementViewer;
