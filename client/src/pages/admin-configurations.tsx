import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  Users,
  Shield,
  GitBranch,
  FileText,
  Building,
  ChevronRight,
} from "lucide-react";

const adminConfigurations = [
  {
    name: "Dropdown Config",
    description: "Manage dropdown options for forms and filters across the platform",
    href: "/admin/dropdown-config",
    icon: Settings,
    category: "System",
  },
  {
    name: "User Management",
    description: "Manage user accounts, roles, and permissions",
    href: "/admin/user-management",
    icon: Users,
    category: "Security",
  },
  {
    name: "Audit Logs",
    description: "View system activities, user actions, and security events",
    href: "/admin/audit-logs",
    icon: Shield,
    category: "Security",
  },
  {
    name: "Approval Hierarchies",
    description: "Configure approval workflows and hierarchies",
    href: "/admin/approval-hierarchies",
    icon: GitBranch,
    category: "Workflow",
  },
  {
    name: "GST Management",
    description: "Configure GST rates, HSN codes, and tax settings",
    href: "/admin/gst-management",
    icon: FileText,
    category: "Compliance",
  },
  {
    name: "Company Profile",
    description: "Manage company details, branches, and organizational settings",
    href: "/admin/company-profile",
    icon: Building,
    category: "Organization",
  },
];

export default function AdminConfigurations() {
  const { user } = useAuth();

  // Restrict access to admin users only
  if ((user as any)?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
        <p className="text-gray-600 mb-6">
          Admin Configurations are only available to administrators.
        </p>
      </div>
    );
  }

  const categories = Array.from(new Set(adminConfigurations.map(config => config.category)));

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Configurations</h1>
          <p className="text-gray-600 mt-2">
            Manage system settings, users, and organizational configurations
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {adminConfigurations.length} Configuration Options
        </Badge>
      </div>

      {/* Configuration Cards by Category */}
      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminConfigurations
              .filter(config => config.category === category)
              .map((config) => (
                <Link key={config.name} href={config.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-200 hover:border-primary cursor-pointer group">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center text-white">
                            <config.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              {config.name}
                            </CardTitle>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {config.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      ))}

      {/* Quick Stats */}
      <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {categories.map((category) => (
            <div key={category} className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {adminConfigurations.filter(config => config.category === category).length}
              </div>
              <div className="text-sm text-muted-foreground">{category} Settings</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}