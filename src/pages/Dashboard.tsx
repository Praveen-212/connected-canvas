import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Ticket, ClipboardList, Users, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  totalDoctors: number;
  todayTokens: number;
  completedToday: number;
  activeQueue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDoctors: 0,
    todayTokens: 0,
    completedToday: 0,
    activeQueue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Realtime subscription
    const channel = supabase
      .channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens" }, fetchStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchStats() {
    const today = new Date().toISOString().split("T")[0];
    const [doctorsRes, tokensRes] = await Promise.all([
      supabase.from("doctors").select("id", { count: "exact" }),
      supabase.from("tokens").select("id, status", { count: "exact" }).eq("token_date", today),
    ]);
    const total = tokensRes.data?.length ?? 0;
    const completed = tokensRes.data?.filter((t) => t.status === "completed").length ?? 0;
    setStats({
      totalDoctors: doctorsRes.count ?? 0,
      todayTokens: total,
      completedToday: completed,
      activeQueue: total - completed,
    });
    setLoading(false);
  }

  const statCards = [
    { label: "Total Doctors", value: stats.totalDoctors, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Today's Tokens", value: stats.todayTokens, icon: Ticket, color: "text-accent", bg: "bg-accent/10" },
    { label: "Active Queue", value: stats.activeQueue, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Completed Today", value: stats.completedToday, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="gradient-hero rounded-2xl p-8 text-primary-foreground shadow-card-hover">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome to ClinicPulse
            </h2>
            <p className="opacity-85 text-lg">
              Manage patient queues efficiently. Today is{" "}
              <span className="font-semibold">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/generate-token">
              <Button variant="secondary" className="font-semibold shadow">
                <Ticket className="h-4 w-4 mr-2" />
                Generate Token
              </Button>
            </Link>
            <Link to="/queue">
              <Button variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/15 font-semibold">
                <ClipboardList className="h-4 w-4 mr-2" />
                View Queue
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-card hover:shadow-card-hover transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`rounded-xl p-3 ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                {!loading && <TrendingUp className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {loading ? <span className="animate-pulse bg-muted rounded h-8 w-12 block" /> : value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold mb-4 text-foreground">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { to: "/doctors", icon: UserPlus, title: "Add New Doctor", desc: "Register a new doctor to the system", color: "text-primary", bg: "bg-primary/10" },
            { to: "/generate-token", icon: Ticket, title: "Generate Token", desc: "Issue a new token for a patient", color: "text-accent", bg: "bg-accent/10" },
            { to: "/queue", icon: ClipboardList, title: "Manage Queue", desc: "View and manage doctor queues", color: "text-success", bg: "bg-success/10" },
          ].map(({ to, icon: Icon, title, desc, color, bg }) => (
            <Link key={to} to={to}>
              <Card className="shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-6 flex gap-4 items-start">
                  <div className={`rounded-xl p-3 ${bg} flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">{title}</h4>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
