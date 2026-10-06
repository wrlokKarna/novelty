import { FieldDefinition } from '../../types';
//import TemplateFieldTarun from './TemplateField.tarun';
//import TemplateFieldChakri from './TemplateField.chakri';
import TemplateField from './TemplateField';

type Props = {
    tmplFields: FieldDefinition[];
};

export default function TemplateTab({ tmplFields }: Props) {
    console.log('[fields]: ', tmplFields);
    return (
        <div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40%, auto))',
                    gap: '12px',
                }}
            >
                {tmplFields.map((f, index) => (
                    <>
                        {/* 
                        <TemplateFieldChakri field={f} index={index} />
                        <TemplateFieldTarun field={f} index={index} />
                        */}
                        <TemplateField field={f} index={index} />
                    </>
                ))}
            </div>
        </div>
    );
}
