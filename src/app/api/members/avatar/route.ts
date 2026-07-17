/**
 * API route for avatar upload.
 * Accepts a multipart form with an image file, uploads to Supabase Storage,
 * and updates the user's avatarUrl in the database.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadAvatar, deleteAvatar, StorageError } from "@/lib/supabase/service-storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please select an image." },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const publicUrl = await uploadAvatar(user.id, file);

    // Update user's avatarUrl in the database
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
    });
  } catch (e) {
    if (e instanceof StorageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[AVATAR] Upload error:", e);
    return NextResponse.json(
      { error: "Failed to upload avatar. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();

    // Delete from Supabase Storage
    await deleteAvatar(user.id);

    // Clear avatarUrl in the database
    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[AVATAR] Delete error:", e);
    return NextResponse.json(
      { error: "Failed to remove avatar. Please try again." },
      { status: 500 }
    );
  }
}