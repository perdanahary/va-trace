import * as React from "react";

import { cn } from "@/lib/utils";

const Form = ({ className, ...props }: React.ComponentProps<"form">) => (
  <form className={cn(className)} {...props} />
);
Form.displayName = "Form";

const FormItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-1.5", className)} {...props} />
);
FormItem.displayName = "FormItem";

const FormLabel = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
);
FormLabel.displayName = "FormLabel";

const FormDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
FormDescription.displayName = "FormDescription";

const FormMessage = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm font-medium text-destructive", className)} {...props}>
    {children}
  </p>
);
FormMessage.displayName = "FormMessage";

const FormField = ({ children }: { children: React.ReactNode }) => <>{children}</>;
FormField.displayName = "FormField";

const FormControl = ({ children }: { children: React.ReactNode }) => <>{children}</>;
FormControl.displayName = "FormControl";

export { Form, FormItem, FormLabel, FormDescription, FormMessage, FormField, FormControl };
