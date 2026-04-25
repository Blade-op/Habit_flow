import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard'; // eagerly loaded — it's the landing page
import { useAuth } from './context/AuthContext';

// Lazily loaded — only bundled/fetched when the route is first visited
const Analytics  = lazy(() => import('./pages/Analytics'));
const AddHabit   = lazy(() => import('./pages/AddHabit'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const Login      = lazy(() => import('./pages/Login'));
const Signup     = lazy(() => import('./pages/Signup'));

// Minimal skeleton shown while lazy chunks are downloading
function PageSkeleton() {
  return (
    <div style={{ padding: '32px' }}>
      <div className="skeleton skeleton-title" style={{ width: '40%', height: 32, marginBottom: 24, borderRadius: 10 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16, marginBottom: 28 }}>
        {[1,2,3,4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 280, borderRadius: 16 }} />
    </div>
  );
}

// Guard that also requires isAdmin
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public routes — no sidebar */}
              <Route path="/login"  element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected routes — with sidebar layout */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="app-layout">
                      <Sidebar />
                      <main className="main-content">
                        <Suspense fallback={<PageSkeleton />}>
                          <Routes>
                            <Route path="/"           element={<Dashboard />} />
                            <Route path="/analytics"  element={<Analytics />} />
                            <Route path="/add-habit"  element={<AddHabit />} />
                            <Route
                              path="/admin/users"
                              element={
                                <AdminRoute>
                                  <AdminUsers />
                                </AdminRoute>
                              }
                            />
                          </Routes>
                        </Suspense>
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
