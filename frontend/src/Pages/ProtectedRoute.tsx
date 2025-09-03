import { Outlet, Navigate } from "react-router-dom";
import { store } from "../store/globalStore";

const ProtectedRoute = () => {
  const token = store.getState().token; // directly read Zustand state

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />; // render nested routes
};

export default ProtectedRoute;