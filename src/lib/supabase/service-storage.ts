/**
 * Server-side Supabase Storage client that uses the service_role key
 * to bypass RLS for storage operations on behalf of authenticated users.
 * 
 * This is needed because UNSACCO uses custom auth (HMAC-signed tokens),
 * not Supabase Auth, so there's no Supabase user session available.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Upload an avatar image for a user.
 * Returns the public URL of the uploaded avatar.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new StorageError(
      "Invalid file type. Allowed: JPEG, PNG, WebP, GIF"
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new StorageError("File too large. Maximum size is 2MB");
  }

  const supabase = getServiceClient();
  const fileExt = file.name.split(".").pop() ?? "jpg";
  const filePath = `${userId}/avatar.${fileExt}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      upsert: true, // Replace existing avatar
      contentType: file.type,
    });

  if (uploadError) {
    console.error("[STORAGE] Upload error:", uploadError);
    throw new StorageError(uploadError.message || "Failed to upload avatar");
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete a user's avatar from storage.
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = getServiceClient();

  // List all files in the user's folder
  const { data: files, error: listError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId);

  if (listError) {
    console.error("[STORAGE] List error:", listError);
    return; // Non-critical, don't throw
  }

  if (!files || files.length === 0) return;

  const paths = files.map((f) => `${userId}/${f.name}`);

  const { error: deleteError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove(paths);

  if (deleteError) {
    console.error("[STORAGE] Delete error:", deleteError);
  }
}