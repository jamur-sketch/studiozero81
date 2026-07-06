import { useState, useEffect } from "react";
import { Ban, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: string;
}

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BlockDialog({ isOpen, onClose, onSuccess, selectedDate }: BlockDialogProps) {
  const today = toLocalDateStr(new Date());
  const [date, setDate] = useState(selectedDate || today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate || today);
      setStartTime("09:00");
      setEndTime("10:00");
      setReason("");
    }
  }, [isOpen, selectedDate]);

  const handleSave = async () => {
    if (!date || !startTime || !endTime) {
      toast({ title: "Preencha data, hora início e hora fim", variant: "destructive" });
      return;
    }
    if (startTime >= endTime) {
      toast({ title: "A hora de início deve ser antes da hora de fim", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00-03:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00-03:00`).toISOString();

      const { data, error } = await supabase.functions.invoke("google-calendar", {
        body: {
          action: "create-block",
          start: startISO,
          end: endISO,
          reason: reason.trim() || "Bloqueio",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Horário bloqueado!" });
      onClose();
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro ao bloquear horário", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-muted-foreground" />
            Bloquear Horário
          </DialogTitle>
          <DialogDescription>
            O horário bloqueado ficará indisponível para agendamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="block-date">Data</Label>
            <Input
              id="block-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="block-start">Início</Label>
              <Input
                id="block-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end">Fim</Label>
              <Input
                id="block-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Input
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reunião, Almoço, Compromisso..."
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="destructive"
            className="rounded-xl gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {saving ? "Bloqueando..." : "Bloquear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
