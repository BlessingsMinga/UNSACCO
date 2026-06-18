"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { toast } from "sonner";
import { Loader2, Save, UserCircle, Mail, Phone, MapPin, Users, Calendar } from "lucide-react";

type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  studentId: string | null;
  phone: string | null;
  program: string | null;
  yearOfStudy: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  nextOfKin: string | null;
  nextOfKinPhone: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  joinedAt: string;
  approvedAt: string | null;
  createdAt: string;
};

export function ProfileTab() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<Profile>("/api/members/me");
        setProfile(res);
        setForm({
          fullName: res.fullName ?? "",
          phone: res.phone ?? "",
          program: res.program ?? "",
          yearOfStudy: res.yearOfStudy ?? "",
          gender: res.gender ?? "MALE",
          address: res.address ?? "",
          nextOfKin: res.nextOfKin ?? "",
          nextOfKinPhone: res.nextOfKinPhone ?? "",
        });
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/api/members/me", form);
      toast.success("Profile updated successfully.");
      if (profile) setProfile({ ...profile, ...form } as Profile);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const initials = (profile.fullName ?? profile.email).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal and membership information</p>
      </div>

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar className="size-20 border-2 border-border">
            <AvatarFallback className="brand-gradient text-white text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold">{profile.fullName}</h3>
              <StatusBadge status={profile.status} />
            </div>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><UserCircle className="size-4" /> {profile.studentId}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="size-4" /> Joined {formatDate(profile.joinedAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Mail className="size-4" /> {profile.program}</span>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Role</p>
            <p className="font-semibold">{profile.role.replace("_", " ")}</p>
          </div>
        </div>
      </Card>

      {/* Editable form */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Personal information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" icon={UserCircle}>
            <Input value={form.fullName ?? ""} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Phone" icon={Phone}>
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+265 ..." />
          </Field>
          <Field label="Program of study" icon={Mail}>
            <Input value={form.program ?? ""} onChange={(e) => setForm({ ...form, program: e.target.value })} />
          </Field>
          <Field label="Year of study">
            <Select value={form.yearOfStudy ?? ""} onValueChange={(v) => setForm({ ...form, yearOfStudy: v })}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Gender">
            <Select value={form.gender ?? "MALE"} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Address" icon={MapPin}>
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, Country" />
          </Field>
        </div>

        <h3 className="font-semibold mt-6 mb-4">Next of kin</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Next of kin name" icon={Users}>
            <Input value={form.nextOfKin ?? ""} onChange={(e) => setForm({ ...form, nextOfKin: e.target.value })} />
          </Field>
          <Field label="Next of kin phone" icon={Phone}>
            <Input value={form.nextOfKinPhone ?? ""} onChange={(e) => setForm({ ...form, nextOfKinPhone: e.target.value })} placeholder="+265 ..." />
          </Field>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Membership details</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Detail label="Student ID" value={profile.studentId ?? "—"} />
          <Detail label="Email" value={profile.email} />
          <Detail label="Status" value={profile.status} />
          <Detail label="Role" value={profile.role.replace("_", " ")} />
          <Detail label="Date joined" value={formatDate(profile.joinedAt)} />
          <Detail label="Approved on" value={profile.approvedAt ? formatDate(profile.approvedAt) : "Pending"} />
        </div>
      </Card>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof UserCircle; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        {label}
      </Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}
