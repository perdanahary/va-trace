import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "next-themes";
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AllOrders } from './pages/admin/AllOrders';
import { OrderDetail } from './pages/admin/OrderDetail';
import { UserList } from './pages/admin/UserList';
import { LogisticsList } from './pages/admin/LogisticsList';
import { SupplierDetail } from './pages/admin/SupplierDetail';
import { SupplierList } from './pages/admin/SupplierList';
import { ProductList } from './pages/admin/ProductList';
import { ProductDetail } from './pages/admin/ProductDetail';
import { BrandList } from './pages/admin/BrandList';
import { SalesPointList } from './pages/admin/SalesPointList';
import { ClientList } from './pages/admin/ClientList';
import { AdminCreateOrder } from './pages/admin/AdminCreateOrder';
import { ClientDashboard } from './pages/client/ClientDashboard';
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
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleSwitcherFloatingButton } from "@/components/layout/RoleSwitcherFloatingButton";
import { SidebarVisibilityProvider } from "@/components/layout/Sidebar";

function App() {
  return (
    <Router>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider delayDuration={0}>
          <SidebarVisibilityProvider>
            <div className="min-h-screen bg-background font-sans text-foreground antialiased">
              <Routes>
              {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/create" element={<AdminCreateOrder />} />
                <Route path="/admin/progress" element={<OrderProgress role="admin" />} />
                <Route path="/admin/orders" element={<AllOrders />} />
                <Route path="/admin/orders/:id" element={<OrderDetail />} />
                <Route path="/admin/orders/:id/delivery-note" element={<DeliveryNotePrint role="admin" />} />
                <Route path="/admin/orders/:id/packaging-labels" element={<PackagingLabelsPrint role="admin" />} />
                <Route path="/admin/imports" element={<ImportDispatchWorkspace role="admin" />} />
                <Route path="/admin/inbox" element={<InboxPage role="admin" />} />
                <Route path="/admin/users" element={<UserList role="admin" />} />
                <Route path="/admin/logistics" element={<LogisticsList />} />
                <Route path="/admin/suppliers" element={<SupplierList />} />
                <Route path="/admin/suppliers/new" element={<SupplierDetail />} />
                <Route path="/admin/suppliers/:id" element={<SupplierDetail />} />
                <Route path="/admin/products" element={<ProductList />} />
                <Route path="/admin/products/:code" element={<ProductDetail />} />
                <Route path="/admin/brands" element={<BrandList />} />
                <Route path="/admin/sales-points" element={<SalesPointList />} />
                <Route path="/admin/clients" element={<ClientList />} />

              {/* Operator Routes */}
                <Route path="/operator" element={<AdminDashboard role="operator" />} />
                <Route path="/operator/create" element={<AdminCreateOrder role="operator" />} />
                <Route path="/operator/progress" element={<OrderProgress role="operator" />} />
                <Route path="/operator/orders" element={<AllOrders role="operator" />} />
                <Route path="/operator/orders/:id" element={<OrderDetail role="operator" />} />
                <Route path="/operator/orders/:id/packaging-labels" element={<PackagingLabelsPrint role="operator" />} />
                <Route path="/operator/imports" element={<ImportDispatchWorkspace role="operator" />} />
                <Route path="/operator/inbox" element={<InboxPage role="operator" />} />

              {/* Analyst Routes */}
                <Route path="/analyst" element={<AdminDashboard role="analyst" />} />
                <Route path="/analyst/progress" element={<OrderProgress role="analyst" />} />
                <Route path="/analyst/orders" element={<AllOrders role="analyst" />} />
                <Route path="/analyst/orders/:id" element={<OrderDetail role="analyst" />} />
                <Route path="/analyst/orders/:id/packaging-labels" element={<PackagingLabelsPrint role="analyst" />} />
                <Route path="/analyst/inbox" element={<InboxPage role="analyst" />} />
                <Route path="/analyst/users" element={<UserList role="analyst" />} />

              {/* Client Routes */}
                <Route path="/client" element={<ClientDashboard />} />
                <Route path="/client/progress" element={<OrderProgress role="client" />} />
                <Route path="/client/create" element={<CreateOrder />} />
                <Route path="/client/imports" element={<ImportUploadPage role="client" />} />
                <Route path="/client/inbox" element={<InboxPage role="client" />} />
              
              {/* Vendor Routes */}
                <Route path="/vendor" element={<VendorDashboard />} />
                <Route path="/vendor/orders" element={<VendorOrders />} />
                <Route path="/vendor/profile" element={<VendorProfile />} />
                <Route path="/vendor/progress" element={<OrderProgress role="vendor" />} />
                <Route path="/vendor/orders/:id" element={<VendorUpdateProgress />} />
                <Route path="/vendor/update/:id" element={<VendorUpdateProgress />} />
                <Route path="/vendor/orders/:id/delivery-note" element={<DeliveryNotePrint role="vendor" />} />
                <Route path="/vendor/orders/:id/packaging-labels" element={<PackagingLabelsPrint role="vendor" />} />
                <Route path="/vendor/inbox" element={<InboxPage role="vendor" />} />
              
              {/* Root Redirect */}
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <RoleSwitcherFloatingButton />
              <Toaster closeButton richColors />
            </div>
          </SidebarVisibilityProvider>
        </TooltipProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
