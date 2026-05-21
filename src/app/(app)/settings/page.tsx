"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type ShopSettings = {
  name: string;
  description: string;
  phone: string;
  website: string;
  logo: string;
};

type SecuritySettings = {
  twoFactorEnabled: boolean;
};

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [params, setParams] = useState<{ error?: string; success?: string }>({});
  const [shopSettings, setShopSettings] = useState<ShopSettings>({
    name: "",
    description: "",
    phone: "",
    website: "",
    logo: "",
  });
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
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
        const [shopRes, securityRes] = await Promise.all([
          fetch("/api/settings/shop"),
          fetch("/api/settings/security"),
        ]);

        if (shopRes.ok) {
          const data = await shopRes.json();
          setShopSettings({
            name: data.name ?? "",
            description: data.description ?? "",
            phone: data.phone ?? "",
            website: data.website ?? "",
            logo: data.logo ?? "",
          });
        }

        if (securityRes.ok) {
          const data = await securityRes.json();
          setSecuritySettings(data);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllSettings();
  }, []);

  const handleSaveShopSettings = async () => {
    try {
      const res = await fetch("/api/settings/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopSettings),
      });

      if (res.ok) {
        setSaveMessage({ type: "success", text: "Shop settings saved!" });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "Error saving settings" });
    }
  };

  const handleChangePassword = async () => {
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
        setSaveMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "Error changing password" });
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-2fa",
          enable2FA: enabled,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSecuritySettings((prev) => ({
          ...prev,
          twoFactorEnabled: data.twoFactorEnabled,
        }));
        setSaveMessage({
          type: "success",
          text: `2FA ${enabled ? "enabled" : "disabled"}`,
        });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      setSaveMessage({ type: "error", text: "Error updating 2FA" });
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
                onChange={(e) =>
                  setShopSettings((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="My Scarf Shop"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Description
              </label>
              <Textarea
                value={shopSettings.description}
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
                  onChange={(e) =>
                    setShopSettings((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+84 123 456 789"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Website
                </label>
                <Input
                  type="url"
                  value={shopSettings.website}
                  onChange={(e) =>
                    setShopSettings((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="https://myshop.com"
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
                onChange={(e) =>
                  setShopSettings((prev) => ({ ...prev, logo: e.target.value }))
                }
                placeholder="https://myshop.com/logo.png"
              />
            </div>

            <Button onClick={handleSaveShopSettings} className="w-full">
              Save Shop Information
            </Button>
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
                <Input
                  type="password"
                  value={passwordChange.oldPassword}
                  onChange={(e) =>
                    setPasswordChange((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  New Password
                </label>
                <Input
                  type="password"
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
                <Input
                  type="password"
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

            {/* Two-Factor Authentication */}
            <div className="space-y-4 border-t border-gray-700 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    Two-Factor Authentication
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    {securitySettings.twoFactorEnabled
                      ? "✓ 2FA is enabled"
                      : "Add an extra layer of security"}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    handleToggle2FA(!securitySettings.twoFactorEnabled)
                  }
                  variant={
                    securitySettings.twoFactorEnabled ? "outline" : "default"
                  }
                >
                  {securitySettings.twoFactorEnabled ? "Disable" : "Enable"}
                </Button>
              </div>
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
