import { ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { spring } from "../utils/motion";

type Props = {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    children: ReactNode;
};

// A native <dialog> keeps what browsers do well (top layer, focus trap, Esc), while the backdrop and panel inside it
// are animated: the dialog stays open until the exit animation ends and only then really closes
export const Modal = ({ open, onClose, labelledBy, children }: Props) => {
    const dialog = useRef<HTMLDialogElement>(null);
    const [mounted, setMounted] = useState(open);

    useEffect(() => {
        if (open) setMounted(true);
    }, [open]);

    useEffect(() => {
        if (open && mounted && dialog.current && !dialog.current.open) dialog.current.showModal();
    }, [open, mounted]);

    if (!mounted) return null;

    return (
        <dialog
            ref={dialog}
            className="modal"
            aria-labelledby={labelledBy}
            onCancel={(event) => {
                // Esc would close the dialog instantly; asking the parent instead lets the exit animation play
                event.preventDefault();
                onClose();
            }}
        >
            <AnimatePresence
                onExitComplete={() => {
                    dialog.current?.close();
                    setMounted(false);
                }}
            >
                {open && <motion.div key="backdrop" className="modal-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />}
                {open && (
                    <motion.div
                        key="panel"
                        className="modal-panel"
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.16 } }}
                        transition={spring}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </dialog>
    );
};
