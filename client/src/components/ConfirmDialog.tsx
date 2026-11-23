import { Modal } from "./Modal";

type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
};

// Replaces the browser's confirm(), which can't be styled or animated and looks out of place in the app
export const ConfirmDialog = ({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) => (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
        <div className="dialog-body">
            <h2 id="confirm-title">{title}</h2>
            <p className="muted">{message}</p>
            <div className="dialog-actions">
                <button type="button" className="button ghost" onClick={onCancel} autoFocus>
                    Cancel
                </button>
                <button type="button" className="button danger" onClick={onConfirm}>
                    {confirmLabel}
                </button>
            </div>
        </div>
    </Modal>
);
