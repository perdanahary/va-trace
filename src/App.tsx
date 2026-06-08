import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "next-themes";
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AllOrders } from './pages/admin/AllOrders';
import { OrderDetail } from './pages/admin/OrderDetail';
import { UserList } from './pages/admin/UserList';
import { LogisticsList } from './pages/admin/LogisticsList';
import { SupplierList } from './pages/admin/SupplierList';
import { ProductList } from './pages/admin/ProductList';
import { ProductDetail } from './pages/admin/ProductDetail';
import { BrandList } from './pages/admin/BrandList';
import { SalesPointList } from './pages/admin/SalesPointList';
import { AdminCreateOrder } from './pages/admin/AdminCreateOrder';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { CreateOrder } from './pages/client/CreateOrder';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { VendorUpdateProgress } from './pages/vendor/UpdateProgress';
import { OrderProgress } from './pages/shared/OrderProgress';
import { DeliveryNotePrint } from './pages/shared/DeliveryNotePrint';
import { PackagingLabelsPrint } from './pages/shared/PackagingLabelsPrint';
import { InboxPage } from './pages/shared/InboxPage';
import { ImportUploadPage } from './pages/shared/ImportUploadPage';
import { ImportDispatchWorkspace } from './pages/admin/ImportDispatchWorkspace';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleSwitcherFloatingButton } from "@/components/layout/RoleSwitcherFloatingButton";

function App() {
  return (
    <Router>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider delayDuration={0}>
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
              <Route path="/admin/products" element={<ProductList />} />
              <Route path="/admin/products/:code" element={<ProductDetail />} />
              <Route path="/admin/brands" element={<BrandList />} />
              <Route path="/admin/sales-points" element={<SalesPointList />} />

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

              {/* Customer Routes */}
              <Route path="/customer" element={<ClientDashboard />} />
              <Route path="/customer/progress" element={<OrderProgress role="customer" />} />
              <Route path="/customer/create" element={<CreateOrder />} />
              <Route path="/customer/imports" element={<ImportUploadPage role="customer" />} />
              <Route path="/customer/inbox" element={<InboxPage role="customer" />} />
              
              {/* Vendor Routes */}
              <Route path="/vendor" element={<VendorDashboard />} />
              <Route path="/vendor/progress" element={<OrderProgress role="vendor" />} />
              <Route path="/vendor/update/:id" element={<VendorUpdateProgress />} />
              <Route path="/vendor/orders/:id/delivery-note" element={<DeliveryNotePrint role="vendor" />} />
              <Route path="/vendor/inbox" element={<InboxPage role="vendor" />} />
              
              {/* Root Redirect */}
              <Route path="/" element={<Navigate to="/admin" replace />} />
            </Routes>
            <RoleSwitcherFloatingButton />
            <Toaster closeButton richColors />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
