import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { useState } from "react";
import { Pencil, ShieldAlert, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";

export default function UsersPage() {
  const users = useQuery(api.users.list, {});
  const { user } = useAuth();
  const createUser = useMutation(api.users.create);
  const updateUser = useMutation(api.users.update);
  const removeUser = useMutation(api.users.remove);
  const removeAllUsers = useMutation(api.users.removeAll);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"users"> | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"users"> | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllConfirmationText, setDeleteAllConfirmationText] = useState("");

  const isEditing = !!editId;

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const openEdit = (u: { _id: Id<"users">; name?: string; email?: string; role?: "admin" | "user"; status?: "active" | "inactive" }) => {
    setEditId(u._id);
    setName(u.name ?? "");
    setEmail(u.email ?? "");
    setPassword("");
    setRole(u.role ?? "user");
    setStatus(u.status ?? "active");
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setName("");
    setEmail("");
    setRole("user");
    setStatus("active");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || (!isEditing && !password.trim())) {
      toast.error("Name, email, and password are required for new users.");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editId) {
        const fields: {
          id: Id<"users">;
          name: string;
          email: string;
          role: "admin" | "user";
          status: "active" | "inactive";
          password?: string;
        } = {
          id: editId,
          name: name.trim(),
          email: email.trim(),
          role,
          status,
        };
        if (password.trim()) {
          fields.password = password.trim();
        }
        await updateUser(fields);
        toast.success("User updated");
      } else {
        await createUser({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          status,
        });
        toast.success("User created");
      }
      setFormOpen(false);
      setEditId(null);
      setPassword("");
    } catch (error) {
      toast.error("Failed to save user");
    }
    setLoading(false);
  };

  const handleDelete = async (id: Id<"users">, email?: string) => {
    if (email && email === user?.email) {
      toast.error("You cannot delete your own account");
      setDeleteConfirm(null);
      return;
    }
    try {
      await removeUser({ id });
      toast.success("User removed");
    } catch {
      toast.error("Failed to remove user");
    }
    setDeleteConfirm(null);
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmationText !== "DELETE_ALL_USERS") {
      toast.error("Please type 'DELETE_ALL_USERS' to confirm");
      return;
    }

    if (!user?.email) {
      toast.error("Admin email not found");
      return;
    }

    try {
      const result = await removeAllUsers({
        confirm: deleteAllConfirmationText,
        adminEmail: user.email
      });
      toast.success(result.message);
      setDeleteAllConfirm(false);
      setDeleteAllConfirmationText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete all users");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">Manage system access and roles</p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => setDeleteAllConfirm(true)}
            className="cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 mr-1" /> Delete All Users
          </Button>
          <Button size="sm" onClick={openCreate} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-1" /> Add User
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users === undefined ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {u.name ?? "—"}
                    {u.email === user?.email && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role ?? "user"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === "inactive" ? "destructive" : "outline"}>
                      {u.status ?? "active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive cursor-pointer"
                        onClick={() => setDeleteConfirm(u._id)}
                        disabled={u.email === user?.email}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditId(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? "Leave blank to keep existing password" : "Password"}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="cursor-pointer">
              {loading ? (isEditing ? "Updating..." : "Saving...") : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this user? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="cursor-pointer">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="cursor-pointer">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllConfirm} onOpenChange={() => setDeleteAllConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ Delete ALL Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">⚠️ DANGER ZONE</p>
              <p className="text-sm text-muted-foreground">
                This action will permanently delete ALL user accounts except your own admin account. 
                This cannot be undone and will remove all user data from the system.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Type "DELETE_ALL_USERS" to confirm:</Label>
              <Input
                id="confirmation"
                value={deleteAllConfirmationText}
                onChange={(e) => setDeleteAllConfirmationText(e.target.value)}
                placeholder="DELETE_ALL_USERS"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteAllConfirm(false)} className="cursor-pointer">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAll}
              disabled={deleteAllConfirmationText !== "DELETE_ALL_USERS"}
              className="cursor-pointer"
            >
              Delete All Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
