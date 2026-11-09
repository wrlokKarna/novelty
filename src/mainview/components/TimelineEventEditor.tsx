import { useEffect, useState } from 'react';
import type { CompendiumCategory } from '../../shared/types/project/compendium';
import type { TimelineEvent } from '../../shared/types/project/timeline';
import SubDialog from '../dialogs/SubDialog';
import TimelineEventFormFields, {
    EMPTY_EVENT_FORM,
    formValuesFromEvent,
    formValuesFromPartial,
    formValuesToPartial,
    type EventFormValues,
} from './TimelineEventForm';

// note! marked for delete

interface TimelineEventEditorProps {
    open: boolean;
    onClose: () => void;
    onSave: (event: Partial<TimelineEvent>) => void;
    event?: TimelineEvent | null;
    draft?: Partial<TimelineEvent> | null;
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
}

export default function TimelineEventEditor({
    open,
    onClose,
    onSave,
    event,
    draft,
    entityOptions,
    chapterOptions,
}: TimelineEventEditorProps) {
    const [values, setValues] = useState<EventFormValues>(EMPTY_EVENT_FORM);

    useEffect(() => {
        if (event) {
            setValues(formValuesFromEvent(event));
        } else if (draft) {
            setValues(formValuesFromPartial(draft));
        } else {
            setValues(EMPTY_EVENT_FORM);
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
            title={event ? 'Edit Event' : 'New Event'}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minWidth: '400px',
                }}
            >
                <TimelineEventFormFields
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
