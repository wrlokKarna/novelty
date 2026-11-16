import styles from './ThemeBuilder.module.css';
import ThemeBuilderForm, {
    type ThemeBuilderFormProps,
} from './ThemeBuilderForm';

export default function ThemeBuilderInline(props: ThemeBuilderFormProps) {
    return (
        <div className={styles.inlineShell}>
            <ThemeBuilderForm {...props} />
        </div>
    );
}
