import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackNavigationProps {
  href: string;
  label?: string;
  className?: string;
}

export function BackNavigation({ href, label = "Back", className }: BackNavigationProps) {
  return (
    <Link href={href}>
      <Button variant="ghost" className={`mb-4 text-muted-foreground hover:text-foreground ${className}`}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </Link>
  );
}