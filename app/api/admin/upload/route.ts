
import { createClient } from "@/lib/supabase-server";
import { NextResponse, type NextRequest } from "next/server";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the signed-in user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    // Verify admin role.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    // Validate request body.
    let body: {
      fileName?: string;
      contentType?: string;
      fileSize?: number;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const fileName = body.fileName?.trim();
    const contentType = body.contentType?.trim().toLowerCase();
    const fileSize = body.fileSize;

    if (
      !fileName ||
      fileName.length > 200 ||
      fileName.includes("/") ||
      fileName.includes("\\") ||
      !contentType ||
      !ALLOWED_VIDEO_TYPES.includes(contentType) ||
      typeof fileSize !== "number" ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_VIDEO_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Use an MP4, WebM, or QuickTime video up to 50 MB.",
        },
        { status: 400 }
      );
    }

    // Generate a unique storage path.
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath =
      `${user.id}/${crypto.randomUUID()}-${safeName}`;

    // Create a signed upload URL.
    const { data, error } = await supabase.storage
      .from("movie-videos")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error("Video upload URL creation failed:", error);

      return NextResponse.json(
        {
          error:
            "Could not create upload URL. Check the movie-videos bucket and its storage permissions.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path: data.path,
      token: data.token,
      contentType,
    });
  } catch (error) {
    console.error("Upload API error:", error);

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
