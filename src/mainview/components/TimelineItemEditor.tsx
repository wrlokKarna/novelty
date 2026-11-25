import { useEffect, useState } from 'react';
import type { CompendiumCategory } from '../../shared/types/project/compendium';
import type { StoryBeat } from '../../shared/types/project/manuscript';
import SubDialog from '../dialogs/SubDialog';
import TimelineItemFormFields, {
    EMPTY_ITEM_FORM,
    formValuesFromItem,
    formValuesFromPartial,
    formValuesToPartial,
    type ItemFormValues,
} from './TimelineItemForm';

// note! marked for delete

interface TimelineItemEditorProps {
    open: boolean;
    onClose: () => void;
    onSave: (event: Partial<StoryBeat>) => void;
    event?: StoryBeat | null;
    draft?: Partial<StoryBeat> | null;
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
}

export default function TimelineItemEditor({
    open,
    onClose,
    onSave,
    event,
    draft,
    entityOptions,
    chapterOptions,
}: TimelineItemEditorProps) {
    const [values, setValues] = useState<ItemFormValues>(EMPTY_ITEM_FORM);

    useEffect(() => {
        if (event) {
            setValues(formValuesFromItem(event));
        } else if (draft) {
            setValues(formValuesFromPartial(draft));
        } else {
            setValues(EMPTY_ITEM_FORM);
        }
    }, [event, draft, open]);

    function handleSave() {
        onSave(formValuesToPartial(values, entityOptions));
        onClose();
    }

    return (
        <SubDialog
            open={open}
            onClose={onClose}
            title={event ? 'Edit Item' : 'New Item'}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minWidth: '400px',
                }}
            >
                <TimelineItemFormFields
                    values={values}
                    onChange={(patch) =>
                        setValues((prev) => ({ ...prev, ...patch }))
                    }
                    entityOptions={entityOptions}
                    chapterOptions={chapterOptions}
                />
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '8px',
                    }}
                >
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{ background: '#333' }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        onClick={handleSave}
                        disabled={!values.title.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </SubDialog>
    );
}

