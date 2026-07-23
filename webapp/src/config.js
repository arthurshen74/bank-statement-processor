/**
 * Runtime Configuration Loader
 *
 * Loads configuration from public/config.json at application startup.
 * This allows configuration to be changed without rebuilding the app,
 * making it ideal for Docker/Kubernetes deployments.
 *
 * Usage:
 *   import { config } from './config';
 *   const url = config.apiBaseUrl;
 */

let config = null;
let configPromise = null;

/**
 * Load configuration from public/config.json
 * @returns {Promise<object>} The configuration object
 */
export async function loadConfig() {
  // Return cached config if already loaded
  if (config) {
    return config;
  }

  // Return existing promise if loading is in progress
  if (configPromise) {
    return configPromise;
  }

  // Load config from public folder
  configPromise = fetch('/config.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      return response.json();
    })
    .then(loadedConfig => {
      config = loadedConfig;
      configPromise = null;
      return config;
    })
    .catch(error => {
      console.error('Error loading configuration:', error);
      // Fallback to default configuration
      config = {
        apiBaseUrl: 'http://localhost:5201/api'
      };
      configPromise = null;
      return config;
    });

  return configPromise;
}

/**
 * Get the current configuration (synchronous)
 * Must be called after loadConfig() has completed
 * @returns {object} The configuration object
 * @throws {Error} If config hasn't been loaded yet
 */
export function getConfig() {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}

/**
 * Export config object for direct access (after loading)
 * Usage: import { config } from './config';
 */
export { config };
