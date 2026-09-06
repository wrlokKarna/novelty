import { useSettings } from '../../contexts/SettingsContext';
import { Provider } from '../../types';
import ProviderCard from '../cards/ProviderCard';

type Props = {
    arr: Provider[];
};

function ProvidersList({ arr }: Props) {
    const { settings } = useSettings();
    console.log(settings);
    return (
        <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
            {arr.map((prov, index) => (
                <ProviderCard
                    key={prov.id}
                    cardData={{ index, config: prov }}
                />
            ))}
        </div>
    );
}

export default ProvidersList;
