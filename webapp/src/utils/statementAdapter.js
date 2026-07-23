/**
 * Adapter function to transform MongoDB statement data into the format expected by TransactionResults.
 * This allows TransactionResults to work with data from MongoDB statements without modification.
 *
 * @param {Array} mongoStatements - Array of statement objects from MongoDB
 * @returns {Object} Transformed data in TransactionResults format
 */
export function adaptMongoStatementsToResults(mongoStatements) {
  if (!mongoStatements || mongoStatements.length === 0) {
    return {
      success: true,
      statements: [],
    };
  }

  return {
    success: true,
    statements: mongoStatements.map((stmt) => ({
      // Map MongoDB statement fields to TransactionResults format
      filename: stmt.fileName,
      statementDate: stmt.statementDate,
      statementYear: stmt.statementYear,
      statementType: stmt.statementType, // IMPORTANT: Each statement carries its type for mixed viewing
      statementProvider: stmt.statementProvider,

      // Transform pages to match expected format
      pages: stmt.pages.map((page) => ({
        pageNumber: page.pageNumber,
        numberOfTransactions: page.numberOfTransactions,

        // Transform transactions
        transactions: page.transactions.map((txn) => ({
          bookingDate: txn.bookingDate,
          bookingText: txn.bookingText,
          amount: txn.amount,
        })),

        // Store GridFS file IDs for authenticated image loading
        // Note: ASP.NET Core serializes to camelCase by default
        // These will be fetched using useAuthenticatedImage hook
        imageFileId: page.pageImage || null,
        croppedImageFileId: page.pageImageCropped || null,
      })),

      // Add summary fields
      totalTransactions: stmt.numberOfTransactions,
      pageCount: stmt.pageCount,
    })),
  };
}
