import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AlertCircle, Check } from "lucide-react";

export function MaintenanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 bg-background/80 backdrop-blur-xl sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <AlertCircle size={28} className="text-primary" />
          </div>
          <DialogTitle className="text-center font-display text-xl">
            Agenda em manutenção
          </DialogTitle>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground">
          Não foi possível continuar com o seu cadastro neste momento. Entre em contato com o estabelecimento.
        </p>
        <div className="mt-2">
          <PrimaryButton icon={<Check size={18} />} onClick={() => onOpenChange(false)}>
            Entendi
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
