import Dialog from '../components/Dialog';

export default function UIDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    return (
        <Dialog open={open} onClose={onClose} title="UI">
            <div className="dialogContent">
                <h1>UI</h1>
            </div>
        </Dialog>
    );
}
