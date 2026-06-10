import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Trash2, X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
};

export function ConfirmCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Cancelar agendamento",
  description = "Você realmente deseja cancelar seu agendamento?",
  confirmText = "Sim, cancelar",
  cancelText = "Não",
  loading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 bg-background/80 backdrop-blur-xl sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <PrimaryButton
            onClick={async () => { await onConfirm(); }}
            disabled={loading}
            icon={<Trash2 size={18} />}
            className="!bg-destructive !text-destructive-foreground hover:opacity-90"
          >
            {confirmText}
          </PrimaryButton>
          <PrimaryButton
            variant="ghost"
            icon={<X size={18} />}
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </PrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
