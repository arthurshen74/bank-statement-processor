import { useMemo } from 'react';

/**
 * Hook to process normalized transaction data from MongoDB
 * All data comes from MongoDB in normalized format (bookingDate, bookingText, amount)
 * Each transaction carries its own statementType from its source statement
 *
 * @param {Object} results - Results object containing statements array
 * @returns {Object} Processed transaction data
 */
export const useTransactionData = (results) => {
  // Extract statements array
  const statements = useMemo(() => results?.statements || [], [results]);

  // Extract all transactions with their source statement metadata
  const allTransactions = useMemo(() => {
    const txns = [];

    statements.forEach((statement) => {
      statement.pages?.forEach((page) => {
        page.transactions?.forEach((transaction) => {
          txns.push({
            // Original transaction fields (MongoDB normalized format)
            ...transaction,

            // Add metadata from source statement and page
            statementType: statement.statementType,
            statementDate: statement.statementDate,
            statementYear: statement.statementYear,
            statementProvider: statement.statementProvider,
            fileName: statement.fileName || statement.filename,
            pageNumber: page.pageNumber,
          });
        });
      });
    });

    return txns;
  }, [statements]);

  // Normalize transactions for the table view
  const normalizedTransactions = useMemo(() => {
    let rowId = 0;

    return allTransactions.map((transaction) => ({
      rowId: rowId++, // Unique ID for row selection
      date: new Date(transaction.bookingDate),
      description: transaction.bookingText,
      amount: transaction.amount,

      // Keep all metadata for linking and display
      statementType: transaction.statementType,
      statementDate: transaction.statementDate,
      statementYear: transaction.statementYear,
      statementProvider: transaction.statementProvider,
      pageNumber: transaction.pageNumber,
      filename: transaction.fileName,
    }));
  }, [allTransactions]);

  /**
   * Get selected transaction details for linking to reports
   * Each transaction has its own statementType from its source statement
   */
  const getSelectedTransactionDetails = (selectedTransactions) => {
    return normalizedTransactions
      .filter((t) => selectedTransactions.includes(t.rowId))
      .map((t) => ({
        date: t.date.toISOString().split('T')[0], // YYYY-MM-DD format
        description: t.description,
        amount: t.amount,
        statementType: t.statementType, // Transaction-level type!
        statementDate: t.statementDate,
        statementYear: t.statementYear,
        statementProvider: t.statementProvider,
        pageNumber: t.pageNumber,
        filename: t.filename,
      }));
  };

  return {
    statements,
    allTransactions,
    normalizedTransactions,
    getSelectedTransactionDetails,
  };
};
