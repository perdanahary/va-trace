import type { ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AllOrders } from './pages/admin/AllOrders';
import { OrderDetail } from './pages/admin/OrderDetail';
import { UserList } from './pages/admin/UserList';
import { SupplierDetail } from './pages/admin/SupplierDetail';
import { SupplierList } from './pages/admin/SupplierList';
import { ProductList } from './pages/admin/ProductList';
import { ProductDetail } from './pages/admin/ProductDetail';
import { BrandList } from './pages/admin/BrandList';
import { SalesPointList } from './pages/admin/SalesPointList';
import { ClientDetail } from './pages/admin/ClientDetail';
import { ClientList } from './pages/admin/ClientList';
import { AdminCreateOrder } from './pages/admin/AdminCreateOrder';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientOrders } from './pages/client/ClientOrders';
import { CreateOrder } from './pages/client/CreateOrder';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { VendorOrders } from './pages/vendor/VendorOrders';
import { VendorProfile } from './pages/vendor/VendorProfile';
import { VendorUpdateProgress } from './pages/vendor/UpdateProgress';
import { OrderProgress } from './pages/shared/OrderProgress';
import { DeliveryNotePrint } from './pages/shared/DeliveryNotePrint';
import { PackagingLabelsPrint } from './pages/shared/PackagingLabelsPrint';
import { InboxPage } from './pages/shared/InboxPage';
import { ImportUploadPage } from './pages/shared/ImportUploadPage';
import { ImportDispatchWorkspace } from './pages/admin/ImportDispatchWorkspace';
import { NotFoundPage } from './pages/shared/NotFoundPage';
import { ShipmentBatchList } from './pages/admin/ShipmentBatchList';
import { ShipmentBatchDetail } from './pages/admin/ShipmentBatchDetail';
import { DeliveryNoteList } from './pages/admin/DeliveryNoteList';
import { ExceptionList } from './pages/admin/ExceptionList';
import { LabelRegister } from './pages/admin/LabelRegister';
import { PodVerificationQueue } from './pages/admin/PodVerificationQueue';
import { ProductionQueue } from './pages/admin/ProductionQueue';
import { ProductionJobDetail } from './pages/admin/ProductionJobDetail';
import { SalesPointDetail } from './pages/admin/SalesPointDetail';
import { BatchDeliveryNotePrint } from './pages/shared/BatchDeliveryNotePrint';
import { BatchLabelsPrint } from './pages/shared/BatchLabelsPrint';
import { VendorPodUpload } from './pages/vendor/VendorPodUpload';
import { runV2Migration } from '@/lib/v2/seed/migrate';

// P1-21 — materialize V2 stores idempotently on app start (legacy key untouched).
runV2Migration();

/** P2-02 — param-preserving redirects from the legacy route table. */
function RedirectWithParam({ to }: { to: (param: string) => string }) {
  const params = useParams();
  const param = Object.values(params)[0] ?? "";
  return <Navigate to={to(param)} replace />;
}
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoSessionSelector } from "@/components/layout/DemoSessionSelector";
import { RoleSwitcherFloatingButton } from "@/components/layout/RoleSwitcherFloatingButton";
import { SidebarVisibilityProvider } from "@/components/layout/Sidebar";
import { useCurrentUser } from "@/lib/authStore";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  operator: "/operator",
  analyst: "/analyst",
  client: "/client",
  vendor: "/vendor",
};

function RoleRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { currentUser } = useCurrentUser();
  const pathRole = location.pathname.split("/")[1];
  const currentRole = currentUser?.role;

  if (currentRole && pathRole in ROLE_HOME && pathRole !== currentRole) {
    return <Navigate to={ROLE_HOME[currentRole]} replace state={{ blockedPath: location.pathname }} />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider delayDuration={0}>
          <MotionConfig reducedMotion="user">
          <SidebarVisibilityProvider>
            <div className="min-h-screen bg-background font-sans text-foreground antialiased">
              <RoleRouteGuard>
              <Routes>
              {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/create" element={<AdminCreateOrder />} />
                <Route path="/admin/progress" element={<OrderProgress userRole="admin" />} />
                <Route path="/admin/orders" element={<AllOrders />} />
                <Route path="/admin/orders/:id" element={<OrderDetail />} />
                <Route path="/admin/orders/:id/delivery-note" element={<DeliveryNotePrint userRole="admin" />} />
                <Route path="/admin/orders/:id/packaging-labels" element={<PackagingLabelsPrint userRole="admin" />} />
                <Route path="/admin/imports" element={<ImportDispatchWorkspace userRole="admin" />} />
                <Route path="/admin/inbox" element={<InboxPage userRole="admin" />} />
                <Route path="/admin/users" element={<UserList userRole="admin" />} />
                <Route path="/admin/production" element={<ProductionQueue />} />
                <Route path="/admin/production/:id" element={<ProductionJobDetail />} />
                <Route path="/admin/shipments" element={<ShipmentBatchList />} />
                <Route path="/admin/shipments/:id" element={<ShipmentBatchDetail />} />
                <Route path="/admin/shipments/:id/delivery-note" element={<BatchDeliveryNotePrint />} />
                <Route path="/admin/shipments/:id/labels" element={<BatchLabelsPrint />} />
                <Route path="/admin/delivery-notes" element={<DeliveryNoteList />} />
                <Route path="/admin/labels" element={<LabelRegister />} />
                <Route path="/admin/pod" element={<PodVerificationQueue />} />
                <Route path="/admin/exceptions" element={<ExceptionList />} />
                <Route path="/admin/sales-points/:id" element={<SalesPointDetail />} />
                {/* P2-02 — legacy logistics redirects (HI-10) */}
                <Route path="/admin/logistics" element={<Navigate to="/admin/shipments" replace />} />
                <Route path="/admin/logistics/shipments" element={<Navigate to="/admin/shipments" replace />} />
                <Route
                  path="/admin/logistics/shipments/:batchId"
                  element={<RedirectWithParam to={(batchId) => `/admin/shipments/${batchId}`} />}
                />
                <Route path="/admin/logistics/delivery-notes" element={<Navigate to="/admin/delivery-notes" replace />} />
                <Route path="/admin/logistics/labels" element={<Navigate to="/admin/labels" replace />} />
                <Route path="/admin/logistics/pod" element={<Navigate to="/admin/pod" replace />} />
                <Route path="/admin/suppliers" element={<SupplierList />} />
                <Route path="/admin/suppliers/new" element={<SupplierDetail />} />
                <Route path="/admin/suppliers/:id" element={<SupplierDetail />} />
                <Route path="/admin/products" element={<ProductList />} />
                <Route path="/admin/products/:code" element={<ProductDetail />} />
                <Route path="/admin/brands" element={<BrandList />} />
                <Route path="/admin/sales-points" element={<SalesPointList />} />
                <Route path="/admin/clients" element={<ClientList />} />
                <Route path="/admin/clients/:id" element={<ClientDetail />} />

              {/* Operator Routes */}
                <Route path="/operator" element={<AdminDashboard userRole="operator" />} />
                <Route path="/operator/create" element={<AdminCreateOrder userRole="operator" />} />
                <Route path="/operator/progress" element={<OrderProgress userRole="operator" />} />
                <Route path="/operator/orders" element={<AllOrders userRole="operator" />} />
                <Route path="/operator/orders/:id" element={<OrderDetail userRole="operator" />} />
                <Route path="/operator/orders/:id/packaging-labels" element={<PackagingLabelsPrint userRole="operator" />} />
                <Route path="/operator/imports" element={<ImportDispatchWorkspace userRole="operator" />} />
                <Route path="/operator/inbox" element={<InboxPage userRole="operator" />} />
                <Route path="/operator/shipments" element={<ShipmentBatchList userRole="operator" />} />
                <Route path="/operator/shipments/:id" element={<ShipmentBatchDetail userRole="operator" />} />
                <Route path="/operator/shipments/:id/delivery-note" element={<BatchDeliveryNotePrint userRole="operator" />} />
                <Route path="/operator/shipments/:id/labels" element={<BatchLabelsPrint userRole="operator" />} />
                <Route path="/operator/delivery-notes" element={<DeliveryNoteList userRole="operator" />} />
                <Route path="/operator/production" element={<ProductionQueue userRole="operator" />} />
                <Route path="/operator/production/:id" element={<ProductionJobDetail userRole="operator" />} />

              {/* Analyst Routes */}
                <Route path="/analyst" element={<AdminDashboard userRole="analyst" />} />
                <Route path="/analyst/progress" element={<OrderProgress userRole="analyst" />} />
                <Route path="/analyst/orders" element={<AllOrders userRole="analyst" />} />
                <Route path="/analyst/orders/:id" element={<OrderDetail userRole="analyst" />} />
                <Route path="/analyst/orders/:id/packaging-labels" element={<PackagingLabelsPrint userRole="analyst" />} />
                <Route path="/analyst/inbox" element={<InboxPage userRole="analyst" />} />
                <Route path="/analyst/users" element={<UserList userRole="analyst" />} />

              {/* Client Routes */}
                <Route path="/client" element={<ClientDashboard />} />
                <Route path="/client/orders" element={<ClientOrders />} />
                <Route path="/client/orders/:id" element={<OrderDetail userRole="client" />} />
                <Route path="/client/progress" element={<OrderProgress userRole="client" />} />
                <Route path="/client/create" element={<CreateOrder />} />
                <Route path="/client/imports" element={<ImportUploadPage userRole="client" />} />
                <Route path="/client/inbox" element={<InboxPage userRole="client" />} />
              
              {/* Vendor Routes */}
                <Route path="/vendor" element={<VendorDashboard />} />
                <Route path="/vendor/orders" element={<VendorOrders />} />
                <Route path="/vendor/profile" element={<VendorProfile />} />
                <Route path="/vendor/progress" element={<OrderProgress userRole="vendor" />} />
                <Route path="/vendor/orders/:id" element={<VendorUpdateProgress />} />
                <Route path="/vendor/update/:id" element={<RedirectWithParam to={(id) => `/vendor/orders/${id}`} />} />
                <Route path="/vendor/orders/:id/delivery-note" element={<DeliveryNotePrint userRole="vendor" />} />
                <Route path="/vendor/orders/:id/packaging-labels" element={<PackagingLabelsPrint userRole="vendor" />} />
                <Route path="/vendor/production" element={<ProductionQueue userRole="vendor" />} />
                <Route path="/vendor/production/:id" element={<ProductionJobDetail userRole="vendor" />} />
                <Route path="/vendor/shipments" element={<ShipmentBatchList userRole="vendor" />} />
                <Route path="/vendor/shipments/:id" element={<ShipmentBatchDetail userRole="vendor" />} />
                <Route path="/vendor/shipments/:id/delivery-note" element={<BatchDeliveryNotePrint userRole="vendor" />} />
                <Route path="/vendor/shipments/:id/labels" element={<BatchLabelsPrint userRole="vendor" />} />
                <Route path="/vendor/delivery-notes" element={<DeliveryNoteList userRole="vendor" />} />
                <Route path="/vendor/pod" element={<VendorPodUpload />} />
                <Route path="/vendor/inbox" element={<InboxPage userRole="vendor" />} />
              
              {/* Root Redirect */}
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </RoleRouteGuard>
              <DemoSessionSelector />
              <RoleSwitcherFloatingButton />
              <Toaster closeButton richColors />
            </div>
          </SidebarVisibilityProvider>
          </MotionConfig>
        </TooltipProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
