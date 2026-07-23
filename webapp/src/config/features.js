/**
 * Feature flags for conditional route bundling
 * Routes can be completely excluded from production builds by setting these to false
 */


// Use import.meta.env for Vite environment variables
const ENABLE_INGEST = import.meta.env.VITE_ENABLE_INGEST !== 'false';
const ENABLE_USER_MANAGEMENT = import.meta.env.VITE_ENABLE_USER_MANAGEMENT !== 'false';
const ENABLE_CATEGORIES = import.meta.env.VITE_ENABLE_CATEGORIES !== 'false';
const ENABLE_CATEGORY_RULES = import.meta.env.VITE_ENABLE_CATEGORY_RULES !== 'false';
const ENABLE_NAMING_RULES = import.meta.env.VITE_ENABLE_NAMING_RULES !== 'false';
const ENABLE_STATEMENTS = import.meta.env.VITE_ENABLE_STATEMENTS !== 'false';

export const features = {
  ingest: ENABLE_INGEST,
  userManagement: ENABLE_USER_MANAGEMENT,
  categories: ENABLE_CATEGORIES,
  categoryRules: ENABLE_CATEGORY_RULES,
  namingRules: ENABLE_NAMING_RULES,
  statements: ENABLE_STATEMENTS,
};
