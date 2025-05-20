import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router";
import './index.css'
import Login from './Login.tsx';
import Admin from './Admin.tsx';
import Student from './Student.tsx';


const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
  {
    path: "/Student",
    element: <Student />,
  },
  
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
         <RouterProvider router={router} />
  </StrictMode>
)
