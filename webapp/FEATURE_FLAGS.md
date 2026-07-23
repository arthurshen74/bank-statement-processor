# Feature Flags & Conditional Route Bundling

This application supports conditional route bundling, allowing you to exclude certain routes and their associated code from production builds. This reduces bundle size and ensures that disabled features are completely removed from the JavaScript payload.

## How It Works

1. **Feature Configuration**: Features are controlled via environment variables in `.env` files
2. **Dynamic Imports**: Route components are loaded conditionally using dynamic imports
3. **Tree Shaking**: Vite's dead code elimination removes unused imports from the production bundle
4. **Runtime Filtering**: Routes are built dynamically based on enabled features

## Available Features

The following features can be toggled:

- `VITE_ENABLE_INGEST` - Statement ingestion pages (Girokonto & Kreditkarte)
- `VITE_ENABLE_USER_MANAGEMENT` - User management pages
- `VITE_ENABLE_CATEGORIES` - Category management
- `VITE_ENABLE_CATEGORY_RULES` - Category rules management
- `VITE_ENABLE_NAMING_RULES` - Naming rules management

## Environment Files

### `.env.development`
All features enabled by default for development.

### `.env.production`
Production configuration. Customize which features to include.

### `.env.production.readonly`
Example configuration that disables all data modification features, creating a read-only build.

## Usage

### Development
```bash
npm run dev
```
Uses `.env.development` - all features enabled.

### Production Build (Full Features)
```bash
npm run build
```
Uses `.env.production`.

### Production Build (Read-Only)
```bash
npm run build:readonly
```
Uses `.env.production.readonly` - only viewing features enabled.

### Custom Build
Create a custom `.env.production.custom` file and build with:
```bash
vite build --mode production.custom
```

## Example Configurations

### Full-Featured Production
```env
VITE_ENABLE_INGEST=true
VITE_ENABLE_USER_MANAGEMENT=true
VITE_ENABLE_CATEGORIES=true
VITE_ENABLE_CATEGORY_RULES=true
VITE_ENABLE_NAMING_RULES=true
```

### Read-Only Dashboard
```env
VITE_ENABLE_INGEST=false
VITE_ENABLE_USER_MANAGEMENT=false
VITE_ENABLE_CATEGORIES=false
VITE_ENABLE_CATEGORY_RULES=false
VITE_ENABLE_NAMING_RULES=false
```

### Reports & Categories Only
```env
VITE_ENABLE_INGEST=false
VITE_ENABLE_USER_MANAGEMENT=false
VITE_ENABLE_CATEGORIES=true
VITE_ENABLE_CATEGORY_RULES=true
VITE_ENABLE_NAMING_RULES=false
```

## Bundle Size Impact

When features are disabled:
- Component code is NOT included in the bundle
- Unused dependencies may be tree-shaken
- Routes are not registered in the router
- Navigation links are not displayed

## Technical Details

### File Structure
- [src/config/features.js](src/config/features.js) - Feature flag configuration
- [src/routes.jsx](src/routes.jsx) - Conditional route building
- `.env.*` files - Environment-specific configuration

### Adding New Feature Flags

1. Add environment variable to [src/config/features.js](src/config/features.js):
```javascript
const ENABLE_MY_FEATURE = import.meta.env.VITE_ENABLE_MY_FEATURE !== 'false';
export const features = {
  // ...
  myFeature: ENABLE_MY_FEATURE,
};
```

2. Update [src/routes.jsx](src/routes.jsx) with conditional import:
```javascript
let MyFeature;
if (features.myFeature) {
  MyFeature = (await import('./pages/MyFeature')).default;
}
```

3. Add conditional route in `buildRoutes()`:
```javascript
if (features.myFeature && MyFeature) {
  children.push({
    path: 'my-feature',
    element: <MyFeature />,
    // ...
  });
}
```

4. Add to `.env` files:
```env
VITE_ENABLE_MY_FEATURE=true
```

## Important Notes

- Environment variables MUST be prefixed with `VITE_` to be accessible in the browser
- Changes to `.env` files require a restart of the dev server
- The default value is `true` if the environment variable is not set
- To disable a feature, explicitly set it to `'false'` (as a string)
