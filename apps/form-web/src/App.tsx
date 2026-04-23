import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";

import MainLayout   from "./layout/MainLayout";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Forms        from "./pages/Forms";
import FieldBuilder from "./pages/FieldBuilder";
import Responses    from "./pages/Responses";

function RequireAuth({ children }: { children: ReactElement }): ReactElement {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        color: "#aaa",
        fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes(): ReactElement {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Login — redirect to home if already authed */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Form builder — full-page, no sidebar */}
      <Route
        path="/builder"
        element={<RequireAuth><FieldBuilder /></RequireAuth>}
      />
      <Route
        path="/builder/:id"
        element={<RequireAuth><FieldBuilder /></RequireAuth>}
      />

      {/* Main layout pages */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <MainLayout>
              <Routes>
                <Route path="/"          element={<Dashboard />}  />
                <Route path="/forms"     element={<Forms />}      />
                <Route path="/responses" element={<Responses />}  />
                <Route path="*"          element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App(): ReactElement {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
