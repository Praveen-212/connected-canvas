import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, Clock, User, Phone, Hash, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface Token {
  id: string;
  token_number: number;
  patient_name: string;
  patient_phone: string;
  status: string;
  created_at: string;
  queue_position: number;
}

export default function Queue() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("doctors").select("id, name, specialization").order("name")
      .then(({ data }) => { if (data) setDoctors(data); setLoadingDoctors(false); });
  }, []);

  useEffect(() => {
    if (!selectedDoctor) { setTokens([]); return; }
    fetchTokens();

    const channel = supabase
      .channel(`queue-${selectedDoctor}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tokens", filter: `doctor_id=eq.${selectedDoctor}` }, fetchTokens)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedDoctor]);

  async function fetchTokens() {
    if (!selectedDoctor) return;
    setLoadingTokens(true);
    setError("");
    const today = new Date().toISOString().split("T")[0];
    const { data, error: fetchError } = await supabase
      .from("tokens")
      .select("*")
      .eq("doctor_id", selectedDoctor)
      .eq("token_date", today)
      .order("token_number", { ascending: true });

    if (fetchError) setError(fetchError.message);
    else setTokens(data ?? []);
    setLoadingTokens(false);
  }

  async function markComplete(tokenId: string) {
    setCompletingId(tokenId);
    const { error: updateError } = await supabase
      .from("tokens")
      .update({ status: "completed" })
      .eq("id", tokenId);
    if (updateError) setError(updateError.message);
    setCompletingId(null);
  }

  const activeTokens = tokens.filter((t) => t.status === "active");
  const completedTokens = tokens.filter((t) => t.status === "completed");
  const doctor = doctors.find((d) => d.id === selectedDoctor);

  function TokenCard({ token, showComplete = false }: { token: Token; showComplete?: boolean }) {
    return (
      <Card className={`shadow-card transition-all ${token.status === "completed" ? "opacity-70" : "hover:shadow-card-hover"}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Token Number */}
            <div className={`rounded-xl w-14 h-14 flex items-center justify-center flex-shrink-0 font-black text-xl ${
              token.status === "completed" ? "bg-success/15 text-success" : "gradient-hero text-primary-foreground"
            }`}>
              #{token.token_number}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground truncate">{token.patient_name}</span>
                <Badge variant={token.status === "completed" ? "secondary" : "default"} className={`text-xs flex-shrink-0 ${
                  token.status === "active" ? "bg-warning/15 text-warning border-warning/30" : ""
                }`}>
                  {token.status === "active" ? <><Clock className="h-3 w-3 mr-1" />Active</> : <><CheckCircle2 className="h-3 w-3 mr-1" />Done</>}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{token.patient_phone}</span>
                <span className="flex items-center gap-1"><Hash className="h-3 w-3" />Queue #{token.queue_position}</span>
              </div>
            </div>

            {/* Action */}
            {showComplete && token.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 border-success/40 text-success hover:bg-success hover:text-success-foreground"
                onClick={() => markComplete(token.id)}
                disabled={completingId === token.id}
              >
                {completingId === token.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Done</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Doctor Queue Management</h2>
        <p className="text-muted-foreground">View and manage today's patient queue per doctor</p>
      </div>

      {/* Doctor Selector */}
      <Card className="shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-2 block">Select Doctor</label>
              {loadingDoctors ? (
                <div className="animate-pulse bg-muted rounded-lg h-10" />
              ) : (
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor to view queue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div>
                          <span className="font-medium">{doc.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">· {doc.specialization}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedDoctor && (
              <Button variant="outline" size="icon" onClick={fetchTokens} disabled={loadingTokens} className="flex-shrink-0 mt-6">
                <RefreshCw className={`h-4 w-4 ${loadingTokens ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!selectedDoctor ? (
        <Card className="shadow-card border-dashed">
          <CardContent className="p-16 text-center text-muted-foreground">
            <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a doctor above</p>
            <p className="text-sm mt-1">Queue data will appear here</p>
          </CardContent>
        </Card>
      ) : loadingTokens ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-muted rounded-xl h-20" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats bar */}
          {doctor && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">{doctor.name}</h3>
                <p className="text-muted-foreground text-sm">{doctor.specialization} · Today's Queue</p>
              </div>
              <div className="flex gap-3">
                <div className="text-center bg-warning/10 rounded-xl px-4 py-2">
                  <div className="text-2xl font-black text-warning">{activeTokens.length}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="text-center bg-success/10 rounded-xl px-4 py-2">
                  <div className="text-2xl font-black text-success">{completedTokens.length}</div>
                  <div className="text-xs text-muted-foreground">Done</div>
                </div>
                <div className="text-center bg-muted rounded-xl px-4 py-2">
                  <div className="text-2xl font-black text-foreground">{tokens.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="active">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Active ({activeTokens.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Done ({completedTokens.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4 space-y-3">
              {activeTokens.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p>No active tokens in queue</p>
                  </CardContent>
                </Card>
              ) : (
                activeTokens.map((token) => (
                  <TokenCard key={token.id} token={token} showComplete />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-3">
              {completedTokens.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-25" />
                    <p>No completed consultations yet</p>
                  </CardContent>
                </Card>
              ) : (
                completedTokens.map((token) => (
                  <TokenCard key={token.id} token={token} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
