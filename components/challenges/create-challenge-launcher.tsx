"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateChallengeDialog } from "@/components/challenges/create-challenge-dialog";

export function CreateChallengeLauncher({ autoOpen }: { autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  return (
    <CreateChallengeDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm">
          <Plus /> New Challenge
        </Button>
      }
    />
  );
}
