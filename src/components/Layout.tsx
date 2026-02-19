import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, UserPlus, Ticket, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "Dashboard", icon: Activity },
  { path: "/doctors", label: "Add Doctor", icon: UserPlus },
  { path: "/generate-token", label: "Generate Token", icon: Ticket },
  { path: "/queue", label: "Doctor Queue", icon: ClipboardList },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground shadow-card-hover sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-foreground/20 rounded-xl p-2">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ClinicPulse
              </h1>
              <p className="text-xs opacity-80">Token Management System</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location.pathname === path
                    ? "bg-primary-foreground/25 text-primary-foreground shadow-sm"
                    : "text-primary-foreground/75 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-primary-foreground/20">
          <div className="flex overflow-x-auto gap-1 px-4 py-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  location.pathname === path
                    ? "bg-primary-foreground/25 text-primary-foreground"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/15"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ClinicPulse · Token Management System
      </footer>
    </div>
  );
}
