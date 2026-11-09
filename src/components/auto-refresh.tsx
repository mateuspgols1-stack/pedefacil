"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atualiza o status do pedido periodicamente, sem recarregar a página inteira. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);

  return null;
}
