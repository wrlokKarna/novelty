import './theme/theme.css';
import {
    initTheme,
    setTheme,
    getStoredTheme,
    getThemeIcon,
    type Theme,
} from './theme';

initTheme();

const app = document.getElementById('app')!;

const themeOptions: Theme[] = ['system', 'light', 'dark'];

function render() {
    const currentTheme = getStoredTheme();

    app.innerHTML = `
		<main>
			<div class="container" style="max-width: 500px;">
				<h1>Settings</h1>
				<p class="subtitle">Configure your app preferences</p>

				<div class="card">
					<h2>Appearance</h2>
					<p>Choose your preferred theme:</p>
					<div class="button-group" style="flex-wrap: wrap;">
						${themeOptions
                            .map(
                                (theme) => `
							<button
								class="${currentTheme === theme ? 'primary' : 'secondary'}"
								data-theme="${theme}"
							>
								${getThemeIcon(theme)} ${theme.charAt(0).toUpperCase() + theme.slice(1)}
							</button>
						`
                            )
                            .join('')}
					</div>
				</div>

				<div class="card">
					<h2>About</h2>
					<p>
						<strong>Cosmic Circuit</strong><br>
						Version 0.0.1
					</p>
					<p>
						A desktop app built with Electrobun, TypeScript, and Vite.
					</p>
				</div>

				<div class="footer">
					<p>Theme changes apply instantly</p>
				</div>
			</div>
		</main>
	`;

    document.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme') as Theme;
            setTheme(theme);
            render();
        });
    });
}

render();
