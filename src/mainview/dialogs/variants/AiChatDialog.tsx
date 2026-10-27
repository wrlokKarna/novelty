import Dialog from '../Dialog';

type Props = { open: boolean; onClose: () => void };

function AiChatDialog({ open, onClose }: Props) {
    return (
        <Dialog
            open={open}
            onClose={() => onClose()}
            title={`Aichat rework`}
            large
        >
            <div className="">Hello</div>
        </Dialog>
    );
}

export default AiChatDialog;
