import { MapPin, MoreHorizontal, Search, Filter, Truck } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function LogisticsList() {
  const shipments = [
    { id: "SHP-001", order: "OR-2026-816972", dest: "WH055 · Jakarta Barat", weight: "375.0 kg", status: "On Delivery" },
    { id: "SHP-002", order: "OR-2026-715187", dest: "WH020 · Medan 1", weight: "250.0 kg", status: "Ready to Ship" },
    { id: "SHP-003", order: "OR-2026-901234", dest: "WH012 · Surabaya", weight: "120.0 kg", status: "Delivered" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <ContentArea>
        <Header title="Logistics & Shipments" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search shipments by ID or order..." className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline">
                <Filter className="h-4 w-4" />
                Filter Carriers
              </Button>
              <Button>Create Shipment</Button>
            </div>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Shipment Tracker</CardTitle>
              <CardDescription>Dispatch and delivery status across active shipments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment ID</TableHead>
                    <TableHead>Source Order</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Total Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-primary" />
                          <span className="font-mono text-xs font-medium">{shipment.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-primary">{shipment.order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {shipment.dest}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{shipment.weight}</TableCell>
                      <TableCell>
                        <StatusBadge status={shipment.status as any} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Open shipment</DropdownMenuItem>
                            <DropdownMenuItem>Print label</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
