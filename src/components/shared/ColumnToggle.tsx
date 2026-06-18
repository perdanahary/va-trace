import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrderRequestTableColumn } from "@/components/domain/tables/OrderRequestTable";

interface ColumnToggleProps {
  columns: OrderRequestTableColumn[];
  visibleColumns: OrderRequestTableColumn[];
  onToggle: (column: OrderRequestTableColumn) => void;
  labels?: Partial<Record<OrderRequestTableColumn, string>>;
}

const defaultLabels: Record<OrderRequestTableColumn, string> = {
  orderRequest: "Order Request",
  clientPo: "Client PO",
  client: "Client",
  project: "Project",
  vendor: "Vendor",
  created: "Created",
  deadline: "Deadline",
  salesPoints: "Sales Points",
  progress: "Progress",
  production: "Production",
  distribution: "Distribution",
  orderedQuantity: "Ordered Qty",
  completedQuantity: "Completed Qty",
  shippedQuantity: "Shipped Qty",
  pod: "Proof of Delivery (POD)",
  exception: "Exception",
};

export function ColumnToggle({ columns, visibleColumns, onToggle, labels }: ColumnToggleProps) {
  const resolvedLabels = { ...defaultLabels, ...labels };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column}
            checked={visibleColumns.includes(column)}
            onCheckedChange={() => onToggle(column)}
          >
            {resolvedLabels[column] ?? column}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
