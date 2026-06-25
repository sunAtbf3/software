import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import SideBarDashboard from "./Components/SideBarDashboard/SideBarDashboard";
import LoginPage from "./LOGIN_SEGMENT/LoginPage";
import ProtectedRoute from "./LOGIN_SEGMENT/ProtectedRoute";
import { useRefreshTokenMutation } from "./REDUX_FEATURES/REDUX_SLICES/Login_Api/authApi";
import {
  clearCredentials,
  setAuthChecked,
  setCredentials,
} from "./REDUX_FEATURES/REDUX_SLICES/Login_Api/authSlice";
import { syncCurrentUserFromAuth } from "./Components/roles";
import { useGetWarehouseByIdQuery } from "./REDUX_FEATURES/REDUX_SLICES/Warehouse_api/warehouseApi";
import { useGetShopByIdQuery } from "./REDUX_FEATURES/REDUX_SLICES/Shop_api/shopApi";
import "./index.css";
import ToastConfig from "./Components/shared/ToastConfig";
import { getOfflineDb, metaRepository, resetOfflineDb } from "./offline";
import { networkMonitor } from "./offline/sync/networkMonitor";

function App() {
  const dispatch = useDispatch();
  const [refreshToken] = useRefreshTokenMutation();
  const { isAuthenticated, user, authChecked } = useSelector((state) => state.auth);


  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      const { accessToken } = e.detail;
      dispatch(setCredentials({ user, accessToken }));
    };
    const handleLogout = () => {
      dispatch(clearCredentials());
    };
    window.addEventListener("auth:tokenRefreshed", handleTokenRefreshed);
    window.addEventListener("auth:logout", handleLogout);
    return () => {
      window.removeEventListener("auth:tokenRefreshed", handleTokenRefreshed);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [dispatch, user]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const payload = await refreshToken().unwrap();
        dispatch(setCredentials(payload));
      } catch (_error) {
        if (!networkMonitor.isOnline()) {
          try {
            await getOfflineDb();
            const session = await metaRepository.getOfflineSession();
            if (session?.user) {
              dispatch(setCredentials({
                user: session.user,
                accessToken: session.accessToken,
                isOfflineSession: true,
              }));
              return;
            }
          } catch (offlineErr) {
            console.error('[auth] offline session restore failed', offlineErr);
          }
        }
        dispatch(clearCredentials());
      } finally {
        dispatch(setAuthChecked(true));
      }
    };

    bootstrapAuth();
  }, [dispatch, refreshToken]);

  useEffect(() => {
    if (!user) { syncCurrentUserFromAuth(null); return; }
    const enrichedUser = {
      ...user,
      locationName: user?.warehouse?.warehouse_name
        || user?.shop?.shop_name
        || user?.warehouse_id
        || user?.shop_id
        || null,
    };
    syncCurrentUserFromAuth(enrichedUser);
  }, [user]);


  if (!authChecked) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="app-spinner" />
      </div>
    );
  }

  return (
    <>
      <ToastConfig />
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <SideBarDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </>
  );
}

export default App;