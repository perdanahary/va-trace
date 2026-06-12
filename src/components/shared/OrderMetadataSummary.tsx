import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getOrderReferenceLinkLabel, type OrderReferenceLink } from "@/lib/orderMetadata";

interface OrderMetadataSummaryProps {
  tags?: string[];
  referenceLink?: OrderReferenceLink;
  className?: string;
}

export function OrderMetadataSummary({ tags = [], referenceLink, className }: OrderMetadataSummaryProps) {
  if (tags.length === 0 && !referenceLink) {
    return null;
  }

  const visibleTags = tags.slice(0, 4);
  const remainingTags = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className={cn("space-y-2", className)}>
      {visibleTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visibleTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
              {tag}
            </Badge>
          ))}
          {remainingTags > 0 ? (
            <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{remainingTags}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {referenceLink ? (
        <a
          href={referenceLink.url}
          target="_blank"
          rel="noreferrer"
          className="block break-words text-xs font-medium text-link hover:underline"
          title={referenceLink.url}
        >
          {getOrderReferenceLinkLabel(referenceLink)}
        </a>
      ) : null}
    </div>
  );
}

