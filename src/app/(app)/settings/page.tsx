"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Textarea } from "@/components/ui/Textarea";

type ShopSettings = {
  name: string;
  description: string;
  phone: string;
  logo: string;
};

type BankSettings = {
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  transferNotePrefix: string;
};

type CurrentUser = {
  role: string;
  isOwner: boolean;
  canManageProducts: boolean;
};

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const router = useRouter();
  const [params, setParams] = useState<{ error?: string; success?: string }>({});
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    name: "",
    description: "",
    phone: "",
    logo: "",
  });
  const [bankSettings, setBankSettings] = useState<BankSettings>({
    bankName: "",
    bankBin: "",
    accountNumber: "",
    accountName: "",
    transferNotePrefix: "PAYMENT",
  });
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordChange, setPasswordChange] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{ oldPassword?: string }>({});

  useEffect(() => {
    const loadParams = async () => {
      const p = await searchParams;
      setParams(p);
    };
    loadParams();
  }, [searchParams]);

  // Load all settings
  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        const [shopRes, meRes] = await Promise.all([
          fetch("/api/settings/shop"),
          fetch("/api/auth/me"),
        ]);

        if (meRes.ok) {
          const me = await meRes.json();
          setCurrentUser({
            role: me.role,
            isOwner: me.isOwner,
            canManageProducts: me.canManageProducts,
          });
        }

        if (shopRes.ok) {
          const data = await shopRes.json();
          setShopSettings({
            name: data.name ?? "",
            description: data.description ?? "",
            phone: data.phone ?? "",
            logo: data.logo ?? "",
          });
          setBankSettings({
            bankName: data.bankConfig?.bankName ?? "",
            bankBin: data.bankConfig?.bankBin ?? "",
            accountNumber: data.bankConfig?.accountNumber ?? "",
            accountName: data.bankConfig?.accountName ?? "",
            transferNotePrefix: data.bankConfig?.transferNotePrefix ?? "PAYMENT",
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllSettings();
  }, []);

  const canEditShop = currentUser?.isOwner ?? false;

  const handleSaveShopSettings = async () => {
    if (!canEditShop) {
      setSaveMessage({ type: "error", text: "Only owners can edit shop information." });
      return;
    }

    try {
      const res = await fetch("/api/settings/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shopSettings,
          bankConfig: {
            bankName: bankSettings.bankName,
            bankBin: bankSettings.bankBin,
            accountNumber: bankSettings.accountNumber,
            accountName: bankSettings.accountName,
            transferNotePrefix: bankSettings.transferNotePrefix,
          },
        }),
      });

      if (res.ok) {
        setSaveMessage({ type: "success", text: "Shop settings saved!" });
        setTimeout(() => setSaveMessage(null), 3000);
        router.refresh();
      } else {
        setSaveMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Error saving settings" });
    }
  };

  const handleChangePassword = async () => {
    setFieldErrors({});

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setSaveMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          oldPassword: passwordChange.oldPassword,
          newPassword: passwordChange.newPassword,
        }),
      });

      if (res.ok) {
        setSaveMessage({ type: "success", text: "Password changed!" });
        setPasswordChange({ oldPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const data = await res.json();
        if (data?.errorCode === "INVALID_CURRENT_PASSWORD") {
          setFieldErrors({ oldPassword: data.error || "Current password is incorrect" });
        }
        setSaveMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Error changing password" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-white/60">
          Manage your shop information and account security
        </p>
      </div>

      {/* Messages */}
      {params.success === "GmailConnected" && (
        <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          ✓ Gmail connected successfully!
        </div>
      )}

      {params.error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          ✗ {params.error}
        </div>
      )}

      {saveMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            saveMessage.type === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-400"
              : "border-red-500/40 bg-red-500/10 text-red-400"
          }`}
        >
          {saveMessage.type === "success" ? "✓" : "✗"} {saveMessage.text}
        </div>
      )}

      {/* Shop Information */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-6 text-xl font-semibold text-white">Shop Information</h2>

        {!canEditShop && !loading && (
          <div className="mb-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-white/70">
            Your account is read-only for shop information. Only the owner can change the shop name, logo, and contact details.
          </div>
        )}

        {loading ? (
          <p className="text-white/50">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Shop Name
              </label>
              <Input
                value={shopSettings.name}
                  disabled={!canEditShop}
                onChange={(e) =>
                  setShopSettings((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="My Scarf Shop"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Bank BIN
              </label>
              <Input
                value={bankSettings.bankBin}
                disabled={!canEditShop}
                onChange={(e) =>
                  setBankSettings((prev) => ({ ...prev, bankBin: e.target.value }))
                }
                placeholder="970422"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Description
              </label>
              <Textarea
                value={shopSettings.description}
                  disabled={!canEditShop}
                onChange={(e) =>
                  setShopSettings((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Tell customers about your shop..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={shopSettings.phone}
                  disabled={!canEditShop}
                  onChange={(e) =>
                    setShopSettings((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+84 123 456 789"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Logo URL
              </label>
              <Input
                type="url"
                value={shopSettings.logo}
                disabled={!canEditShop}
                onChange={(e) =>
                  setShopSettings((prev) => ({ ...prev, logo: e.target.value }))
                }
                placeholder="https://myshop.com/logo.png"
              />
              <p className="mt-1 text-xs text-white/50">
                Logo will be used as the shop avatar in the sidebar.
              </p>
            </div>

            {canEditShop && (
              <Button onClick={handleSaveShopSettings} className="w-full">
                Save Shop Information
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bank Transfer QR Settings */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-6 text-xl font-semibold text-white">Bank Transfer QR</h2>

        {!canEditShop && !loading && (
          <div className="mb-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-white/70">
            Only the owner can change bank transfer details used to generate QR codes.
          </div>
        )}

        {loading ? (
          <p className="text-white/50">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Bank Name
              </label>
              <Input
                value={bankSettings.bankName}
                disabled={!canEditShop}
                onChange={(e) =>
                  setBankSettings((prev) => ({ ...prev, bankName: e.target.value }))
                }
                placeholder="MB Bank"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Account Number
                </label>
                <Input
                  value={bankSettings.accountNumber}
                  disabled={!canEditShop}
                  onChange={(e) =>
                    setBankSettings((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                  placeholder="0123456789"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Account Name
                </label>
                <Input
                  value={bankSettings.accountName}
                  disabled={!canEditShop}
                  onChange={(e) =>
                    setBankSettings((prev) => ({
                      ...prev,
                      accountName: e.target.value,
                    }))
                  }
                  placeholder="TEN CHU TAI KHOAN"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Transfer Note Prefix
              </label>
              <Input
                value={bankSettings.transferNotePrefix}
                disabled={!canEditShop}
                onChange={(e) =>
                  setBankSettings((prev) => ({
                    ...prev,
                    transferNotePrefix: e.target.value,
                  }))
                }
                placeholder="PAYMENT"
              />
              <p className="mt-1 text-xs text-white/50">
                This text will be encoded into the QR as the suggested transfer note.
              </p>
            </div>

            {canEditShop && (
              <Button onClick={handleSaveShopSettings} className="w-full">
                Save Bank QR Settings
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h2 className="mb-6 text-xl font-semibold text-white">Security</h2>

        {loading ? (
          <p className="text-white/50">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="space-y-4">
              <div className="border-b border-gray-700 pb-4">
                <h3 className="text-lg font-medium text-white">Change Password</h3>
                <p className="mt-1 text-sm text-white/60">
                  Update your account password
                </p>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Current Password
                </label>
                <PasswordInput
                  value={passwordChange.oldPassword}
                  onChange={(e) =>
                    setPasswordChange((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
                {fieldErrors.oldPassword && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.oldPassword}</p>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  New Password
                </label>
                <PasswordInput
                  value={passwordChange.newPassword}
                  onChange={(e) =>
                    setPasswordChange((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Confirm Password
                </label>
                <PasswordInput
                  value={passwordChange.confirmPassword}
                  onChange={(e) =>
                    setPasswordChange((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
              </div>

              <Button onClick={handleChangePassword} className="w-full">
                Update Password
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Back link */}
      <Link href="/dashboard">
        <button className="text-sm text-blue-400 hover:text-blue-300">
          ← Back to Dashboard
        </button>
      </Link>
    </div>
  );
}
