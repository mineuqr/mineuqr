import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLanguage } from "@/contexts/LanguageContext";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

type AdminShellBreadcrumbsProps = {
  items: AdminBreadcrumbItem[];
};

export function AdminShellBreadcrumbs({ items }: AdminShellBreadcrumbsProps) {
  const { language } = useLanguage();
  const sep = language === "ar" ? "‹" : "›";

  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={`${item.label}-${index}`} className="contents">
              {index > 0 ? (
                <BreadcrumbSeparator>{sep}</BreadcrumbSeparator>
              ) : null}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
