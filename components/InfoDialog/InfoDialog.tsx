import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function InfoDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    //     {
    //     title,
    //     children,
    //     onClose,
    // }: Readonly<{
    //     title: string;
    //     children: React.ReactNode;
    //     onClose: () => void;
    // }>
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>SMTUC Realtime</DialogTitle>
                    <DialogDescription>Aplicação SMTUC.</DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}
