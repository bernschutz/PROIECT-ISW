import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './pages/App.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <App/>,
    children: [
      { index: true, element: <Dashboard/> },
      { path: 'auth', element: <AuthPage/> },
    ]
  }
]);

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
