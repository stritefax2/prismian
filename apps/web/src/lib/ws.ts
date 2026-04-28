import { useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";
import type { ChangeEvent } from "@teammem/shared";

export function useWorkspaceSocket(
  workspaceId: string | undefined,
  onEvent: (event: ChangeEvent) => void
) {
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const eventType =
            payload.eventType === "INSERT"
              ? "entry_created"
              : payload.eventType === "UPDATE"
                ? "entry_updated"
                : "entry_deleted";

          onEvent({
            type: eventType,
            workspace_id: workspaceId,
            collection_id: (payload.new as any)?.collection_id || (payload.old as any)?.collection_id || "",
            entry_id: (payload.new as any)?.id || (payload.old as any)?.id || "",
            changed_by: { type: "user", id: "", name: "" },
            timestamp: new Date().toISOString(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, onEvent]);
}
