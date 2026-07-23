/**
 * UI Configuration for different statement types
 * All data is now normalized from MongoDB, so we only need UI settings
 */

/**
 * Statement type UI configurations
 */
export const STATEMENT_CONFIGS = {
  girokonto: {
    statementType: 'girokonto',
    displayName: 'Bank Account',
    hasCroppedView: true, // Shows toggle between full page and cropped table view
  },

  kreditkarte: {
    statementType: 'kreditkarte',
    displayName: 'Credit Card',
    hasCroppedView: false, // Only full page view available
  },
};

/**
 * Get configuration for a statement type
 * Falls back to girokonto if unknown type
 */
export const getStatementConfig = (statementType) => {
  const normalizedType = statementType?.toLowerCase();
  const config = STATEMENT_CONFIGS[normalizedType];

  if (!config) {
    console.warn(
      `Unknown statement type: ${statementType}, falling back to girokonto`
    );
    return STATEMENT_CONFIGS.girokonto;
  }

  return config;
};
