import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-4 [&>svg]:row-span-2 [&>svg]:mt-0.5 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        processing:
          "border-processing/20 bg-processing/5 text-foreground [&>svg]:text-processing",
        success:
          "border-success/20 bg-success/5 text-foreground [&>svg]:text-success",
        warning:
          "border-warning/20 bg-warning/5 text-foreground [&>svg]:text-warning",
        destructive:
          "border-destructive/20 bg-destructive/5 text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />,
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />,
);
AlertDescription.displayName = "AlertDescription";

const AlertDefaultIcon = Terminal;

export { Alert, AlertTitle, AlertDescription, AlertDefaultIcon, alertVariants };
