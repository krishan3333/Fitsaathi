"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

export function AvatarUpload({ userId, name, avatarUrl }: { userId: string; name: string; avatarUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(avatarUrl);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
      setPreview(data.publicUrl);
      router.refresh();
    }
    setUploading(false);
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setUploading(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    // Best-effort cleanup — every past upload for this user lives under their own
    // storage folder, so clear it out rather than leaving orphaned files behind.
    const { data: files } = await supabase.storage.from("avatars").list(userId);
    if (files?.length) {
      await supabase.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    }
    setPreview(null);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="relative inline-block">
      <button type="button" className="relative block" onClick={() => inputRef.current?.click()} aria-label="Change profile photo">
        <Avatar className="size-20">
          <AvatarImage src={preview ?? undefined} alt={name} />
          <AvatarFallback className="text-xl">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
        </span>
      </button>
      {preview && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove profile photo"
          title="Remove profile photo"
          className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-danger text-danger-foreground shadow"
        >
          <X className="size-3.5" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
