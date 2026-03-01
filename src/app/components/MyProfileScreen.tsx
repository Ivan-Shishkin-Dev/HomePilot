import { useNavigate } from "react-router";
import { useState } from "react";
import {
  Mail,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  Loader2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { ScoreRing } from "./ScoreRing";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 800) return { label: "Excellent", color: "#10B981" };
  if (score >= 650) return { label: "Good", color: "#F59E0B" };
  return { label: "Needs Work", color: "#EF4444" };
}

export function MyProfileScreen() {
  const navigate = useNavigate();
  const { profile, user, loading: authLoading, signOut } = useAuth();

  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setDeleteAccountError(null);
    setDeleteAccountLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("delete-user", {
        body: {},
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      await signOut().catch(() => {});
      navigate("/", { replace: true });
      return;
    } catch {
      // Fallback when Edge Function is not deployed or unreachable: delete profile and sign out
      const { error: deleteProfileError } = await supabase.from("profiles").delete().eq("id", user!.id);
      if (deleteProfileError) {
        setDeleteAccountError(deleteProfileError.message || "Failed to delete account. Try again.");
        return;
      }
      await signOut().catch(() => {});
      navigate("/", { replace: true });
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    setEmailStatus(null);
    if (!newEmail.trim()) {
      setEmailStatus({ type: "error", message: "Please enter an email address." });
      return;
    }
    if (newEmail.trim().toLowerCase() === (user?.email ?? "").toLowerCase()) {
      setEmailStatus({ type: "error", message: "That's already your current email." });
      return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    if (error) {
      setEmailStatus({ type: "error", message: error.message });
    } else {
      setEmailStatus({ type: "success", message: "Confirmation sent to your new email. Check your inbox to verify." });
      setNewEmail("");
    }
  };

  const validateNewPassword = (pw: string): string[] => {
    const issues: string[] = [];
    if (pw.length < 8) issues.push("At least 8 characters");
    if (!/[A-Z]/.test(pw)) issues.push("An uppercase letter");
    if (!/[a-z]/.test(pw)) issues.push("A lowercase letter");
    if (!/[0-9]/.test(pw)) issues.push("A number");
    if (!/[^A-Za-z0-9]/.test(pw)) issues.push("A special character (e.g. !@#$%)");
    return issues;
  };

  const handleChangePassword = async () => {
    setPasswordStatus(null);
    if (!currentPassword) {
      setPasswordStatus({ type: "error", message: "Please enter your current password." });
      return;
    }
    const issues = validateNewPassword(newPassword);
    if (issues.length > 0) {
      setPasswordStatus({
        type: "error",
        message: `New password must contain:\n${issues.map((i) => `• ${i}`).join("\n")}`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    setPasswordSaving(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (signInError) {
      setPasswordSaving(false);
      setPasswordStatus({ type: "error", message: "Current password is incorrect." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordStatus({ type: "error", message: error.message });
    } else {
      setPasswordStatus({ type: "success", message: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };
  const getUserInitials = () => {
    if (!profile) return "??";
    const first = profile.first_name?.[0] || "";
    const last = profile.last_name?.[0] || "";
    return (first + last).toUpperCase() || "??";
  };

  const getUserDisplayName = () => {
    if (!profile) return "Loading...";
    if (profile.first_name || profile.last_name)
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return profile.email || "User";
  };

  const score = profile?.renter_score || 0;
  const { label: scoreLabel, color: scoreColor } = getScoreLabel(score);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 lg:px-10 py-5 lg:py-6">
        <div className="max-w-7xl mx-auto">
          <h1
            className="text-foreground text-[24px] lg:text-[28px]"
            style={{ fontWeight: 700 }}
          >
            My Profile
          </h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            Your renter identity at a glance
          </p>
        </div>
      </div>

      <div className="px-6 lg:px-10 py-6 lg:py-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Profile Info + Renter Score */}
          <div className="flex flex-col gap-5">
            {/* Profile card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 border border-border flex-1"
            >
              <div className="flex flex-col items-center mb-5">
                <div
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center text-white text-[26px] mb-3"
                  style={{ fontWeight: 700 }}
                >
                  {getUserInitials()}
                </div>
                <h3
                  className="text-foreground text-[20px]"
                  style={{ fontWeight: 600 }}
                >
                  {getUserDisplayName()}
                </h3>
                <p className="text-muted-foreground text-[13px]">
                  Renter since{" "}
                  {new Date(profile?.created_at || Date.now()).getFullYear()}
                </p>
              </div>

              <div className="flex flex-col gap-3 text-[14px]">
                {[
                  { icon: Mail, label: profile?.email || "No email" },
                  {
                    icon: MapPin,
                    label: profile?.preferred_cities?.[0] || "Location not set",
                  },
                  {
                    icon: Calendar,
                    label: `Looking for: ${
                      profile?.move_in_date
                        ? new Date(profile.move_in_date).toLocaleDateString(
                            "en-US",
                            { month: "long", year: "numeric" }
                          )
                        : "Not set"
                    }`,
                  },
                  {
                    icon: User,
                    label: profile?.max_budget
                      ? `Budget $${profile.max_budget.toLocaleString()}/mo`
                      : "Budget not set",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <item.icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Renter Score */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-5 border border-border flex items-center gap-5 flex-1"
            >
              <ScoreRing score={score} size={80} strokeWidth={6} label="" />
              <div>
                <p
                  className="text-foreground text-[15px]"
                  style={{ fontWeight: 600 }}
                >
                  Renter Score
                </p>
                <p className="text-[13px]" style={{ fontWeight: 500, color: scoreColor }}>
                  {scoreLabel}
                </p>
                <button
                  onClick={() => navigate("/passport")}
                  className="flex items-center gap-1 text-[#10B981] text-[12px] mt-1"
                  style={{ fontWeight: 600 }}
                >
                  View Passport <ChevronRight size={13} />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Change Email + Change Password */}
          <div className="flex flex-col gap-5">
            {/* Change Email */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-5 border border-border flex-1"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Mail size={18} className="text-[#10B981]" />
                <p className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>
                  Change Email
                </p>
              </div>

              <p className="text-muted-foreground text-[13px] mb-1.5">
                Current: {user?.email ?? "—"}
              </p>
              <p className="text-muted-foreground text-[12px] mb-3">
                A confirmation link will be sent to your email for verification.
              </p>

              <div className="flex flex-col gap-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
                />

                {emailStatus && (
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] ${
                    emailStatus.type === "success"
                      ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/15"
                      : "bg-red-500/10 text-red-500 border border-red-500/15"
                  }`}>
                    {emailStatus.type === "success"
                      ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span>{emailStatus.message}</span>
                  </div>
                )}

                <button
                  onClick={handleChangeEmail}
                  disabled={emailSaving || !newEmail.trim()}
                  className="self-end bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[13px] hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontWeight: 600 }}
                >
                  {emailSaving ? <Loader2 size={15} className="animate-spin" /> : "Update Email"}
                </button>
              </div>
            </motion.div>

            {/* Change Password */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl p-5 border border-border flex-1"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <KeyRound size={18} className="text-[#10B981]" />
                <p className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>
                  Change Password
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <input
                  type={showNewPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px] transition-[color,box-shadow]"
                />

                {passwordStatus && (
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] ${
                    passwordStatus.type === "success"
                      ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/15"
                      : "bg-red-500/10 text-red-500 border border-red-500/15"
                  }`}>
                    {passwordStatus.type === "success"
                      ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span className="whitespace-pre-line">{passwordStatus.message}</span>
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="self-end bg-[#10B981] text-white px-5 py-2.5 rounded-xl text-[13px] hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontWeight: 600 }}
                >
                  {passwordSaving ? <Loader2 size={15} className="animate-spin" /> : "Update Password"}
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Delete account */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 pt-8 border-t border-border"
        >
          <button
            type="button"
            onClick={() => {
              setDeleteAccountError(null);
              setDeleteDialogOpen(true);
            }}
            className="flex items-center gap-2 text-[#EF4444] hover:text-red-400 transition-colors text-[14px]"
            style={{ fontWeight: 600 }}
          >
            <Trash2 size={18} />
            Delete account
          </button>
        </motion.div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete account</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently delete your profile and account. You will not be able to sign in again. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteAccountError && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] bg-red-500/10 text-red-500 border border-red-500/15">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{deleteAccountError}</span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteAccountLoading}
              className="px-4 py-2.5 rounded-xl text-[14px] border border-border bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteAccountLoading}
              className="px-4 py-2.5 rounded-xl text-[14px] bg-[#EF4444] text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontWeight: 600 }}
            >
              {deleteAccountLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Deleting…
                </span>
              ) : (
                "Yes, delete my account"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
