import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import RealtimeQuerySync from '@/lib/RealtimeQuerySync';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const PUBLIC_PAGES = new Set(['Login', 'Register', 'ForgotPassword', 'ResetPassword']);
const PUBLIC_PAGES_SKIP_AUTH_REDIRECT = new Set(['ForgotPassword', 'ResetPassword']);
const homePath = createPageUrl('Home');
const loginPath = createPageUrl('Login');

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated } = useAuth();
  const location = useLocation();
  const fromUrl = `${location.pathname}${location.search}${location.hash}`;
  const loginRedirect = `${loginPath}?from_url=${encodeURIComponent(fromUrl)}`;

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated ? (
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        ) : (
          <Navigate to={loginRedirect} replace />
        )
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            PUBLIC_PAGES.has(path) ? (
              isAuthenticated && !PUBLIC_PAGES_SKIP_AUTH_REDIRECT.has(path)
                ? <Navigate to={homePath} replace />
                : (
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                )
            ) : (
              isAuthenticated
                ? (
                  <LayoutWrapper currentPageName={path}>
                    <Page />
                  </LayoutWrapper>
                )
                : <Navigate to={loginRedirect} replace />
            )
          }
        />
      ))}
      <Route
        path="*"
        element={isAuthenticated ? <PageNotFound /> : <Navigate to={loginRedirect} replace />}
      />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <RealtimeQuerySync />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
