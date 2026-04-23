import { Authenticated, Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  RefineSnackbarProvider,
  ThemedLayout,
  useNotificationProvider,
} from "@refinedev/mui";
import Navkit from '@taruvi/navkit';
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import routerProvider, { DocumentTitleHandler } from "@refinedev/react-router";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { taruviClient } from "./taruviClient";
import {
  taruviDataProvider,
  taruviAuthProvider,
  taruviStorageProvider,
  taruviAppProvider,
  taruviUserProvider,
  // taruviAccessControlProvider, // Uncomment to enable Cerbos-based access control
} from "./providers/refineProviders";
import { ConsoleLogDrawer, CustomSider, ErrorBoundary, UnsavedChangesDialog } from "./components";
import { LoginRedirect } from "./components/auth/LoginRedirect";
import { ColorModeContextProvider, ColorModeContext } from "./contexts/color-mode";
import {AppSettingsProvider, useAppSettings} from "./contexts/app-settings";
import { useContext, useRef, useEffect } from "react";
import { Home } from "./pages/home";
import { BouquetCreate, BouquetEdit, BouquetList, BouquetShow } from "./pages/bouquets";
import { OrderEdit, OrderList, OrderShow } from "./pages/orders";

const AppContent = () => {
  const { setMode } = useContext(ColorModeContext);
  const navRef = useRef<HTMLDivElement>(null);
  const { settings } = useAppSettings()

  useEffect(() => {
    if (navRef.current) {
      const height = navRef.current.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', `${height}px`);
    }
  }, []);

  return (
    <>
      <div
        ref={navRef}
        data-nav-container
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1300,
          width: '100%',
        }}
      >
        <Navkit
          client={taruviClient}
          getTheme={(theme) => setMode(theme)}
        />
      </div>
      <RefineSnackbarProvider>
            <DevtoolsProvider>
              <Refine
                dataProvider={{
                  default: taruviDataProvider,
                  storage: taruviStorageProvider,
                  app: taruviAppProvider,
                  user: taruviUserProvider,
                }}
                notificationProvider={useNotificationProvider}
                routerProvider={routerProvider}
                authProvider={taruviAuthProvider}
                // accessControlProvider={taruviAccessControlProvider} // Uncomment to enable Cerbos-based access control
                resources={[
                  {
                    name: "bouquets",
                    list: "/bouquets",
                    create: "/bouquets/create",
                    edit: "/bouquets/edit/:id",
                    show: "/bouquets/show/:id",
                    meta: { canDelete: true, label: "Bouquets", aclResource: "datatable:bouquets", icon: <LocalFloristRoundedIcon /> },
                  },
                  {
                    name: "orders",
                    list: "/orders",
                    edit: "/orders/edit/:id",
                    show: "/orders/show/:id",
                    meta: { canDelete: false, label: "Orders", aclResource: "datatable:orders", icon: <ReceiptLongRoundedIcon /> },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "obEpHJ-M7JimA-31GF1J",
                }}
              >
                <Routes>
                  <Route index element={<Home />} />
                  <Route
                    element={
                      <Authenticated key="authenticated-inner" fallback={<LoginRedirect />}>
                        <ThemedLayout Header={() => null} Sider={CustomSider} initialSiderCollapsed={true}>
                          <Box sx={{ ml: { xs: 0, md: "72px" }, transition: "margin-left 0.2s ease-in-out" }}>
                            <ErrorBoundary>
                              <Outlet />
                            </ErrorBoundary>
                          </Box>
                          <ConsoleLogDrawer />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route path="bouquets" element={<BouquetList />} />
                    <Route path="bouquets/create" element={<BouquetCreate />} />
                    <Route path="bouquets/edit/:id" element={<BouquetEdit />} />
                    <Route path="bouquets/show/:id" element={<BouquetShow />} />
                    <Route path="orders" element={<OrderList />} />
                    <Route path="orders/edit/:id" element={<OrderEdit />} />
                    <Route path="orders/show/:id" element={<OrderShow />} />
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesDialog />
                <DocumentTitleHandler handler={() => settings?.displayName || ""}/>
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </RefineSnackbarProvider>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AppSettingsProvider>
            <CssBaseline />
            <GlobalStyles styles={{ html: { WebkitFontSmoothing: "auto" } }} />
            <AppContent />
          </AppSettingsProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
