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
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { taruviClient } from "./taruviClient";
import {
  taruviDataProvider,
  taruviAuthProvider,
  taruviStorageProvider,
  taruviFunctionsProvider,
  taruviAppProvider,
  taruviUserProvider,
  taruviAnalyticsProvider,
  // taruviAccessControlProvider, // Uncomment to enable Cerbos-based access control
} from "./providers/refineProviders";
import { CustomSider } from "./components/sidenav";
import { LoginRedirect } from "./components/auth/LoginRedirect";
import { ColorModeContextProvider, ColorModeContext } from "./contexts/color-mode";
import { AppSettingsProvider } from "./contexts/app-settings";
import { useContext, useRef, useEffect, useState } from "react";
import { Home } from "./pages/home";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import {
  AssignmentList,
  AssignmentCreate,
  AssignmentEdit,
  AssignmentShow,
} from "./pages/assignments";
import {
  AssignmentGroupList,
  AssignmentGroupCreate,
  AssignmentGroupEdit,
  AssignmentGroupShow,
} from "./pages/assignment-groups";
import type { TaruviUser } from "./providers/refineProviders";
import { canManageAssignments } from "./features/assignments/access";

const AppContent = () => {
  const { setMode } = useContext(ColorModeContext);
  const navRef = useRef<HTMLDivElement>(null);
  const [identity, setIdentity] = useState<TaruviUser | null>(null);
  const canAdmin = canManageAssignments(identity);

  const resources = [
    {
      name: "assignments",
      list: "/assignments",
      ...(canAdmin ? { create: "/assignments/create", edit: "/assignments/edit/:id" } : {}),
      show: "/assignments/show/:id",
      meta: {
        label: "Assignments",
        icon: <AssignmentOutlined />,
      },
    },
    ...(canAdmin
      ? [
          {
            name: "assignment_groups",
            list: "/assignment-groups",
            create: "/assignment-groups/create",
            edit: "/assignment-groups/edit/:id",
            show: "/assignment-groups/show/:id",
            meta: {
              label: "Assignment Groups",
              icon: <GroupsOutlined />,
            },
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (navRef.current) {
      const height = navRef.current.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', `${height}px`);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    taruviAuthProvider
      .getIdentity?.()
      .then((user) => {
        if (!cancelled) {
          setIdentity((user as TaruviUser | null) ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIdentity(null);
        }
      });

    return () => {
      cancelled = true;
    };
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
                  functions: taruviFunctionsProvider,
                  app: taruviAppProvider,
                  user: taruviUserProvider,
                  analytics: taruviAnalyticsProvider,
                }}
                notificationProvider={useNotificationProvider}
                routerProvider={routerProvider}
                authProvider={taruviAuthProvider}
                // accessControlProvider={taruviAccessControlProvider} // Uncomment to enable Cerbos-based access control
                resources={resources}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "obEpHJ-M7JimA-31GF1J",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<LoginRedirect />}
                      >
                        <ThemedLayout Header={() => null} Sider={CustomSider} initialSiderCollapsed={true}>
                          <Box sx={{ ml: { xs: 0, md: '72px' }, transition: 'margin-left 0.2s ease-in-out' }}>
                            <Outlet />
                          </Box>
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route index element={canAdmin ? <Home /> : <Navigate to="/assignments" replace />} />
                    <Route path="assignments" element={<AssignmentList />} />
                    <Route
                      path="assignments/create"
                      element={canAdmin ? <AssignmentCreate /> : <Navigate to="/assignments" replace />}
                    />
                    <Route
                      path="assignments/edit/:id"
                      element={canAdmin ? <AssignmentEdit /> : <Navigate to="/assignments" replace />}
                    />
                    <Route path="assignments/show/:id" element={<AssignmentShow />} />
                    <Route
                      path="assignment-groups"
                      element={canAdmin ? <AssignmentGroupList /> : <Navigate to="/assignments" replace />}
                    />
                    <Route
                      path="assignment-groups/create"
                      element={canAdmin ? <AssignmentGroupCreate /> : <Navigate to="/assignments" replace />}
                    />
                    <Route
                      path="assignment-groups/edit/:id"
                      element={canAdmin ? <AssignmentGroupEdit /> : <Navigate to="/assignments" replace />}
                    />
                    <Route
                      path="assignment-groups/show/:id"
                      element={canAdmin ? <AssignmentGroupShow /> : <Navigate to="/assignments" replace />}
                    />
                    <Route path="*" element={canAdmin ? <ErrorComponent /> : <Navigate to="/assignments" replace />} />
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
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
