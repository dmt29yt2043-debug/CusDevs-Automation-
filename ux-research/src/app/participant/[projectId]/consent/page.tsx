"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

// Consent is now merged into welcome page. This redirects any old links.
export default function ConsentPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    router.replace(`/participant/${projectId}/welcome`);
  }, [projectId, router]);

  return null;
}
