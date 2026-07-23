import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import StatementViewer from './pages/StatementViewer';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import {
  HomeModernIcon,
  DocumentTextIcon,
  CreditCardIcon,
  FolderOpenIcon,
  TagIcon,
  ChartBarIcon,
  PencilIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { features } from './config/features';

// Conditional lazy imports - tree-shaken when features are disabled
// Lazy loading allows us to conditionally import without top-level await
const ExtractGirokontoStatement = features.ingest
  ? lazy(() => import('./pages/ExtractGirokontoStatement'))
  : null;
const ExtractCreditCardStatement = features.ingest
  ? lazy(() => import('./pages/ExtractCreditCardStatement'))
  : null;

const Categories = features.categories
  ? lazy(() => import('./pages/Categories'))
  : null;

const CategoryRules = features.categoryRules
  ? lazy(() => import('./pages/CategoryRules'))
  : null;

const NamingRules = features.namingRules
  ? lazy(() => import('./pages/NamingRules'))
  : null;

const Users = features.userManagement
  ? lazy(() => import('./pages/Users'))
  : null;
const NewUser = features.userManagement
  ? lazy(() => import('./pages/NewUser'))
  : null;
const EditUser = features.userManagement
  ? lazy(() => import('./pages/EditUser'))
  : null;

const Statements = features.statements
  ? lazy(() => import('./pages/Statements'))
  : null;

// Build routes array conditionally based on feature flags
const buildRoutes = () => {
  const children = [
    {
      index: true,
      element: (
        <ProtectedRoute allowedRoles={['Admin', 'ReadWrite', 'ReadOnly']}>
          <Home />
        </ProtectedRoute>
      ),
      name: 'Home',
      description: 'Targobank Statement Extractor',
    },
    {
      path: 'reports',
      element: (
        <ProtectedRoute allowedRoles={['Admin', 'ReadWrite', 'ReadOnly']}>
          <Reports />
        </ProtectedRoute>
      ),
      icon: ChartBarIcon,
      name: 'Reports',
      description: 'View and manage transaction reports',
    },
    {
      path: 'reports/:id',
      element: (
        <ProtectedRoute allowedRoles={['Admin', 'ReadWrite', 'ReadOnly']}>
          <ReportDetail />
        </ProtectedRoute>
      ),
      // No icon means it won't show in navigation menu
    },
    {
      path: 'statements/view',
      element: (
        <ProtectedRoute allowedRoles={['Admin', 'ReadWrite', 'ReadOnly']}>
          <StatementViewer />
        </ProtectedRoute>
      ),
      // No icon means it won't show in navigation menu
    },
  ];

  // Conditionally add statements route
  if (features.statements && Statements) {
    children.push({
      path: 'statements',
      element: (
        <ProtectedRoute allowedRoles={['Admin', 'ReadWrite', 'ReadOnly']}>
          <Statements />
        </ProtectedRoute>
      ),
      icon: ArchiveBoxIcon,
      name: 'Statements',
      description: 'View and manage ingested statements',
    });
  }

  if (features.categories || features.categoryRules || features.namingRules) {
    // Add a root route for Rules/Categories if any sub-feature is enabled
    children.push({
      path: 'rules-categories',
      name: 'Rules & Categories',
      icon: TagIcon,
      children: [],
    });

    const rootRoute = children.find((r) => r.path === 'rules-categories');

    // Conditionally add categories route
    if (features.categories && Categories) {
      rootRoute.children.push({
        path: 'categories',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'ReadWrite']}>
            <Categories />
          </ProtectedRoute>
        ),
        icon: FolderOpenIcon,
        name: 'Categories',
        description: 'Manage category definitions',
      });
    }

    // Conditionally add category rules route
    if (features.categoryRules && CategoryRules) {
      rootRoute.children.push({
        path: 'category-rules',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'ReadWrite']}>
            <CategoryRules />
          </ProtectedRoute>
        ),
        icon: TagIcon,
        name: 'Category Rules',
        description: 'Manage transaction categorization rules',
      });
    }

    // Conditionally add naming rules route
    if (features.namingRules && NamingRules) {
      rootRoute.children.push({
        path: 'naming-rules',
        element: (
          <ProtectedRoute allowedRoles={['Admin', 'ReadWrite']}>
            <NamingRules />
          </ProtectedRoute>
        ),
        icon: PencilIcon,
        name: 'Naming Rules',
        description: 'Manage transaction naming rules',
      });
    }
  }

  // Conditionally add ingest routes
  if (
    features.ingest &&
    ExtractGirokontoStatement &&
    ExtractCreditCardStatement
  ) {
    children.push({
      path: 'ingest',
      name: 'Ingest Statements',
      icon: DocumentTextIcon,
      children: [
        {
          path: 'targo-pdflib',
          element: (
            <ProtectedRoute allowedRoles={['Admin', 'ReadWrite']}>
              <ExtractGirokontoStatement />
            </ProtectedRoute>
          ),
          icon: DocumentTextIcon,
          name: 'Girokonto',
          description: 'Extract transactions from Girokonto statements.',
        },
        {
          path: 'targo-creditcard',
          element: (
            <ProtectedRoute allowedRoles={['Admin', 'ReadWrite']}>
              <ExtractCreditCardStatement />
            </ProtectedRoute>
          ),
          icon: CreditCardIcon,
          name: 'Kreditkarte',
          description: 'Extract transactions from Kreditkarte statements.',
        },
      ],
    });
  }

  // Conditionally add user management routes
  if (features.userManagement && Users && NewUser && EditUser) {
    children.push(
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <Users />
          </ProtectedRoute>
        ),
        icon: UserGroupIcon,
        name: 'Users',
        description: 'Manage user accounts and permissions',
      },
      {
        path: 'users/new',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <NewUser />
          </ProtectedRoute>
        ),
        // No icon means it won't show in navigation menu
      },
      {
        path: 'users/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['Admin']}>
            <EditUser />
          </ProtectedRoute>
        ),
        // No icon means it won't show in navigation menu
      }
    );
  }

  return [
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/',
      element: <Layout />,
      children,
    },
  ];
};

export const routerData = buildRoutes();

export const router = createBrowserRouter(routerData);
