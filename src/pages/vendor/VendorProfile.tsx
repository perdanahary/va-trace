import { useMemo } from "react";
import { Building2, User } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStore } from "@/lib/userStore";
import { getSupplierSnapshot } from "@/lib/supplierStore";

export function VendorProfile() {
  const { users } = useUserStore();

  const vendorData = useMemo(() => {
    const vendorUser = users.find((u) => u.role === "vendor" && u.status === "Active");

    const suppliers = getSupplierSnapshot();
    const supplier = suppliers.find((s) => s.id === "SUP-004") ?? null;

    return { user: vendorUser ?? null, supplier };
  }, [users]);

  if (!vendorData.user) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="vendor" />
        <ContentArea>
          <Header title="My Profile" />
          <main className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No vendor profile found.</p>
          </main>
        </ContentArea>
      </div>
    );
  }

  const { user: vendor, supplier } = vendorData;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
      <ContentArea>
        <Header title="My Profile" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium">Informasi</p>
            <p>Silakan hubungi PMG Indonesia untuk melakukan pembaruan profil perusahaan Anda.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Akun Pengguna
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Nama" value={vendor.name} />
              <Field label="Email" value={vendor.email} />
              <Field label="Perusahaan" value={vendor.company} />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={vendor.status === "Active" ? "default" : "secondary"}>
                  {vendor.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {supplier && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Profil Perusahaan
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Nama Perusahaan" value={supplier.name} />
                <Field label="Tipe" value={supplier.type} />
                <Field label="PIC" value={supplier.picName} />
                <Field label="Email PIC" value={supplier.email} />
                <Field label="Telepon" value={supplier.phone} />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={supplier.status === "ACTIVE" ? "default" : "secondary"}>
                    {supplier.status}
                  </Badge>
                </div>
                {supplier.addressLines && supplier.addressLines.length > 0 && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground">Alamat</p>
                    {supplier.addressLines.map((line, i) => (
                      <p key={i} className="font-medium">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </ContentArea>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
