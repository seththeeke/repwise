import { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usersApi } from '@/api/users';
import type { UserProfile } from '@/types';

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaved: () => void;
}

export function EditProfileSheet({
  open,
  onClose,
  profile,
  onSaved,
}: EditProfileSheetProps) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [profilePhoto, setProfilePhoto] = useState(profile.profilePhoto ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName ?? '');
      setBio(profile.bio ?? '');
      setProfilePhoto(profile.profilePhoto ?? '');
      setError(null);
    }
  }, [open, profile.displayName, profile.bio, profile.profilePhoto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await usersApi.patchMe({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        profilePhoto: profilePhoto.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
        <Input
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short bio"
        />
        <Input
          label="Profile photo URL"
          value={profilePhoto}
          onChange={(e) => setProfilePhoto(e.target.value)}
          placeholder="https://..."
        />
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
