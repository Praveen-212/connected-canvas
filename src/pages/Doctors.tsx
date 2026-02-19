import { useEffect, useState } from "react";
import { UserPlus, Stethoscope, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  created_at: string;
}

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", specialization: "" });

  useEffect(() => {
    fetchDoctors();
    const channel = supabase
      .channel("doctors-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, fetchDoctors)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchDoctors() {
    const { data, error } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
    if (!error && data) setDoctors(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) return setError("Doctor name is required.");
    if (!form.specialization.trim()) return setError("Specialization is required.");

    setSubmitting(true);
    const { error: insertError } = await supabase.from("doctors").insert({
      name: form.name.trim(),
      specialization: form.specialization.trim(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(`Dr. ${form.name} has been added successfully!`);
      setForm({ name: "", specialization: "" });
    }
    setSubmitting(false);
  }

  const specializations = [
    "General Physician", "Cardiologist", "Dermatologist", "Neurologist",
    "Orthopedic", "Pediatrician", "Psychiatrist", "ENT Specialist",
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Doctor Management</h2>
        <p className="text-muted-foreground">Add and manage clinic doctors</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Add Doctor Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New Doctor
            </CardTitle>
            <CardDescription>Register a new doctor to start accepting patient tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Doctor Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization *</Label>
                <Input
                  id="specialization"
                  placeholder="e.g. Cardiologist"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  disabled={submitting}
                  list="specializations"
                />
                <datalist id="specializations">
                  {specializations.map((s) => <option key={s} value={s} />)}
                </datalist>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {specializations.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, specialization: s })}
                      className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-success text-sm bg-success/10 p-3 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding Doctor...</> : <><UserPlus className="h-4 w-4 mr-2" /> Add Doctor</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Doctors List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-accent" />
            Registered Doctors ({doctors.length})
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-muted rounded-xl h-20" />
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No doctors registered yet.</p>
                <p className="text-sm">Add your first doctor above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {doctors.map((doc, idx) => (
                <Card key={doc.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="gradient-hero rounded-xl w-12 h-12 flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                      {doc.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{doc.name}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">{doc.specialization}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                      <div className="font-medium text-foreground">#{idx + 1}</div>
                      <div>{new Date(doc.created_at).toLocaleDateString("en-IN")}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
