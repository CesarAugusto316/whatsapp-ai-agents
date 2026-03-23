"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Key, Bell, Palette, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AccountPage() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [apiKey, setApiKey] = useState("sk-••••••••••••••••••••••••");
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  const handleRegenerateApiKey = () => {
    toast.success("API key regenerated");
    setApiKey("sk-" + Math.random().toString(36).substring(2, 15));
  };

  return (
    <div className="flex size-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Profile Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <UserIcon className="size-5" />
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <Separator />

            <div className="flex items-center gap-6">
              <Avatar className="size-20">
                <AvatarImage src="/avatar.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                Change Avatar
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="name">Name</label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* API Key Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="size-5" />
              <h2 className="text-lg font-semibold">API Key</h2>
            </div>
            <Separator />

            <div className="flex items-center gap-4">
              <Input value={apiKey} readOnly className="font-mono" />
              <Button onClick={handleRegenerateApiKey} variant="outline">
                Regenerate
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Your API key is used to authenticate requests to the API. Keep it
              secret and never share it with anyone.
            </p>
          </section>

          {/* Billing Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-5" />
              <h2 className="text-lg font-semibold">Billing</h2>
            </div>
            <Separator />

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Plan</p>
                  <p className="text-muted-foreground text-sm">Pro Plan</p>
                </div>
                <Button variant="outline">Manage Subscription</Button>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="size-5" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-muted-foreground text-sm">
                  Receive updates and announcements via email
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
          </section>

          {/* Appearance Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="size-5" />
              <h2 className="text-lg font-semibold">Appearance</h2>
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-muted-foreground text-sm">
                  Use dark theme across the application
                </p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="grid gap-2">
              <label>Language</label>
              <Select defaultValue="en">
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
