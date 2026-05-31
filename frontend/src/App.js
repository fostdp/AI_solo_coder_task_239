import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AlumniWall from './pages/AlumniWall';
import AlumniDetail from './pages/AlumniDetail';
import MyProfile from './pages/MyProfile';
import AdminDashboard from './pages/AdminDashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Circles from './pages/Circles';
import CircleDetail from './pages/CircleDetail';
import Messages from './pages/Messages';
import News from './pages/News';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/alumni" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? (
          <Navigate to={isAdmin ? "/admin" : "/alumni"} replace />
        ) : (
          <Login />
        )}
      />
      <Route
        path="/register"
        element={isAuthenticated ? (
          <Navigate to={isAdmin ? "/admin" : "/alumni"} replace />
        ) : (
          <Register />
        )}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Navigate to="/alumni" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/alumni"
        element={
          <PrivateRoute>
            <AlumniWall />
          </PrivateRoute>
        }
      />
      <Route
        path="/alumni/:id"
        element={
          <PrivateRoute>
            <AlumniDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <MyProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/events"
        element={
          <PrivateRoute>
            <Events />
          </PrivateRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <PrivateRoute>
            <EventDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/circles"
        element={
          <PrivateRoute>
            <Circles />
          </PrivateRoute>
        }
      />
      <Route
        path="/circles/:id"
        element={
          <PrivateRoute>
            <CircleDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <PrivateRoute>
            <Messages />
          </PrivateRoute>
        }
      />
      <Route
        path="/news"
        element={
          <PrivateRoute>
            <News />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
