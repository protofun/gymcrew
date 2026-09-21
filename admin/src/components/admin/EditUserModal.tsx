import { useState } from "react";
import { toast } from "sonner";

import Label from "../form/Label";
import Select from "../form/Select";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { api, ApiError, type AdminUserDetail, type UserProfileUpdate } from "../../lib/api";

type FormValues = {
  fullName: string;
  username: string;
  email: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  age: string;
  gymName: string;
  goal: string;
  experienceLevel: string;
};

function valuesFromUser(user: AdminUserDetail): FormValues {
  return {
    fullName: user.fullName ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    gender: user.gender ?? "",
    heightCm: user.heightCm?.toString() ?? "",
    weightKg: user.weightKg?.toString() ?? "",
    age: user.age?.toString() ?? "",
    gymName: user.gymName ?? "",
    goal: user.goal ?? "",
    experienceLevel: user.experienceLevel ?? "",
  };
}

/** Only the fields that differ from what's stored — so saving never rewrites data nobody touched. */
function changedFields(initial: FormValues, current: FormValues): UserProfileUpdate {
  const changes: UserProfileUpdate = {};
  const numeric = new Set(["heightCm", "weightKg", "age"]);
  for (const key of Object.keys(current) as (keyof FormValues)[]) {
    if (current[key].trim() === initial[key].trim()) continue;
    const value = current[key].trim();
    (changes as Record<string, string | number>)[key] = numeric.has(key) && value !== "" ? Number(value) : value;
  }
  return changes;
}

type EditUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserDetail;
  onSaved: (user: AdminUserDetail) => void;
};

export function EditUserModal({ isOpen, onClose, user, onSaved }: EditUserModalProps) {
  // The form is its own component so it starts from the user's current data every time the modal opens.
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[640px] p-6 sm:p-8">
      <EditUserForm user={user} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function EditUserForm({ user, onClose, onSaved }: Omit<EditUserModalProps, "isOpen">) {
  const [initial] = useState(() => valuesFromUser(user));
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSave() {
    const changes = changedFields(initial, values);
    if (Object.keys(changes).length === 0) {
      toast.info("Nothing changed");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateUserProfile(user.id, changes);
      toast.success("Profile updated");
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h5 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Edit Profile</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Changes apply straight away and show up in the app the next time this person opens it. Leave a field empty to clear it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Full name</Label>
          <Input value={values.fullName} onChange={set("fullName")} />
        </div>
        <div>
          <Label>Username</Label>
          <Input value={values.username} onChange={set("username")} placeholder="lowercase, 3–20 characters" />
        </div>
        <div className="sm:col-span-2">
          <Label>Email</Label>
          <Input type="email" value={values.email} onChange={set("email")} />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Also changed in their login account: they sign in with the new address from now on, and the old one stops working.
          </p>
        </div>
        <div>
          <Label>Gender</Label>
          <Select
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
            defaultValue={values.gender}
            placeholder="Not set"
            onChange={(gender) => setValues((prev) => ({ ...prev, gender }))}
          />
        </div>
        <div>
          <Label>Age</Label>
          <Input type="number" value={values.age} onChange={set("age")} />
        </div>
        <div>
          <Label>Height (cm)</Label>
          <Input type="number" value={values.heightCm} onChange={set("heightCm")} />
        </div>
        <div>
          <Label>Weight (kg)</Label>
          <Input type="number" step={0.1} value={values.weightKg} onChange={set("weightKg")} />
        </div>
        <div className="sm:col-span-2">
          <Label>Gym</Label>
          <Input value={values.gymName} onChange={set("gymName")} />
        </div>
        <div>
          <Label>Goal</Label>
          <Input value={values.goal} onChange={set("goal")} />
        </div>
        <div>
          <Label>Experience</Label>
          <Input value={values.experienceLevel} onChange={set("experienceLevel")} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
