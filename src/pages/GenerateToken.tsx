import { useEffect, useState } from "react";
import { Ticket, User, Phone, Stethoscope, AlertCircle, CheckCircle2, Loader2, Hash, Calendar, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface TokenResult {
  token_number: number;
  token_date: string;
  queue_position: number;
  token_id: string;
  doctor_name: string;
  patient_name: string;
}

export default function GenerateToken() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TokenResult | null>(null);
  const [form, setForm] = useState({ doctorId: "", patientName: "", patientPhone: "" });

  useEffect(() => {
    supabase.from("doctors").select("id, name, specialization").order("name")
      .then(({ data }) => { if (data) setDoctors(data); setLoadingDoctors(false); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!form.doctorId) return setError("Please select a doctor.");
    if (!form.patientName.trim()) return setError("Patient name is required.");
    if (!form.patientPhone.trim()) return setError("Patient phone is required.");
    if (!/^\d{10}$/.test(form.patientPhone.trim())) return setError("Phone number must be exactly 10 digits.");

    setSubmitting(true);
    const { data, error: fnError } = await supabase.rpc("generate_token", {
      p_doctor_id: form.doctorId,
      p_patient_name: form.patientName.trim(),
      p_patient_phone: form.patientPhone.trim(),
    });

    if (fnError) {
      setError(fnError.message);
    } else if (data && data.length > 0) {
      const doctor = doctors.find((d) => d.id === form.doctorId);
      setResult({
        token_number: data[0].token_number,
        token_date: data[0].token_date,
        queue_position: data[0].queue_position,
        token_id: data[0].token_id,
        doctor_name: doctor?.name ?? "",
        patient_name: form.patientName.trim(),
      });
      setForm({ doctorId: "", patientName: "", patientPhone: "" });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Generate Patient Token</h2>
        <p className="text-muted-foreground">Issue a new token for a patient with a selected doctor</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" />
              Token Request Form
            </CardTitle>
            <CardDescription>Fill in patient details to issue a queue token</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="doctor">Select Doctor *</Label>
                {loadingDoctors ? (
                  <div className="animate-pulse bg-muted rounded-lg h-10" />
                ) : (
                  <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })} disabled={submitting}>
                    <SelectTrigger id="doctor">
                      <SelectValue placeholder="Choose a doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">No doctors registered yet</div>
                      ) : (
                        doctors.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            <div>
                              <span className="font-medium">{doc.name}</span>
                              <span className="text-muted-foreground text-xs ml-2">· {doc.specialization}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="patientName"
                    className="pl-9"
                    placeholder="Full name of patient"
                    value={form.patientName}
                    onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientPhone">Patient Phone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="patientPhone"
                    className="pl-9"
                    placeholder="10-digit mobile number"
                    type="tel"
                    maxLength={10}
                    value={form.patientPhone}
                    onChange={(e) => setForm({ ...form, patientPhone: e.target.value.replace(/\D/g, "") })}
                    disabled={submitting}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting || loadingDoctors}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating Token...</>
                  : <><Ticket className="h-4 w-4 mr-2" /> Generate Token</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Token Result */}
        <div>
          {result ? (
            <Card className="shadow-card-hover border-2 border-accent/30 overflow-hidden">
              <div className="gradient-hero p-6 text-primary-foreground text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-90" />
                <h3 className="text-xl font-bold">Token Generated!</h3>
                <p className="opacity-85 text-sm">Patient is queued successfully</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="text-center mb-6">
                  <div className="text-7xl font-black text-gradient mb-1">
                    #{result.token_number}
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">Token Number</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Stethoscope, label: "Doctor", value: result.doctor_name, color: "text-primary" },
                    { icon: User, label: "Patient", value: result.patient_name, color: "text-accent" },
                    { icon: ListOrdered, label: "Queue Position", value: `#${result.queue_position}`, color: "text-warning" },
                    { icon: Calendar, label: "Date", value: new Date(result.token_date).toLocaleDateString("en-IN"), color: "text-success" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-muted rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                        {label}
                      </div>
                      <div className="font-semibold text-foreground text-sm truncate">{value}</div>
                    </div>
                  ))}
                </div>

                <Button variant="secondary" className="w-full" onClick={() => setResult(null)}>
                  Generate Another Token
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <Ticket className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Token will appear here</p>
                <p className="text-sm mt-1">Fill the form and submit to generate a patient token</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
