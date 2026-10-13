import './theme/theme.css';
import {
    initTheme,
    toggleTheme,
    getStoredTheme,
    getThemeIcon,
    getResolvedTheme,
} from './theme';

initTheme();

const app = document.getElementById('app')!;

let count = 0;

async function openSettings() {
    try {
        await fetch('http://localhost:50001/api/open-settings', {
            method: 'POST',
        });
    } catch {
        console.log('Could not open settings');
    }
}

function render() {
    const currentTheme = getStoredTheme();
    const resolvedTheme = getResolvedTheme();
    const themeIcon = getThemeIcon(currentTheme);

    app.innerHTML = `
		<main>
			<div class="container">
				<div class="header">
					<h1>Cosmic Circuit</h1>
					<div class="header-actions">
						<button class="icon-btn" id="theme-btn" title="Theme: ${currentTheme}">
							${themeIcon}
						</button>
						<button class="icon-btn" id="settings-btn" title="Settings">
							⚙️
						</button>
					</div>
				</div>
				<p class="subtitle">A fast desktop app with hot module replacement</p>

				<div class="card">
					<h2>Theme Demo</h2>
					<p>
						Current theme: <strong>${currentTheme}</strong>
						(resolved: <strong>${resolvedTheme}</strong>)
					</p>
					<div class="button-group">
						<button class="primary" id="theme-toggle-btn">
							Toggle Theme (${getThemeIcon(getStoredTheme())})
						</button>
					</div>
				</div>

				<div class="card">
					<h2>Interactive Counter</h2>
					<p>
						Click the button below to test vanilla TypeScript. With HMR enabled,
						you can edit this file and see changes instantly.
					</p>
					<div class="button-group">
						<button class="primary" id="increment-btn">
							Count: ${count}
						</button>
						<button class="secondary" id="reset-btn">
							Reset
						</button>
					</div>
				</div>

				<div class="card">
					<h2>Getting Started</h2>
					<ul>
						<li>
							<span class="number">1.</span>
							Run <code>bun run dev</code> for development without HMR
						</li>
						<li>
							<span class="number">2.</span>
							Run <code>bun run dev:hmr</code> for development with hot reload
						</li>
						<li>
							<span class="number">3.</span>
							Run <code>bun run build</code> to build for production
						</li>
					</ul>
				</div>

				<div class="card">
					<h2>Stack</h2>
					<div class="stack-grid">
						<div class="stack-item">
							<span class="icon">⚡</span>
							<span>Electrobun</span>
						</div>
						<div class="stack-item">
							<span class="icon">🟦</span>
							<span>TypeScript</span>
						</div>
						<div class="stack-item">
							<span class="icon">🔥</span>
							<span>Vite HMR</span>
						</div>
						<div class="stack-item">
							<span class="icon">📦</span>
							<span>Bun</span>
						</div>
					</div>
				</div>

				<div class="footer">
					<p>
						Edit <code>src/mainview/main.ts</code> and save to see HMR in action
					</p>
				</div>
			</div>
		</main>
	`;

    document.getElementById('increment-btn')!.addEventListener('click', () => {
        count++;
        render();
    });

    document.getElementById('reset-btn')!.addEventListener('click', () => {
        count = 0;
        render();
    });

    document.getElementById('theme-btn')!.addEventListener('click', () => {
        toggleTheme();
        render();
    });

    document
        .getElementById('theme-toggle-btn')!
        .addEventListener('click', () => {
            toggleTheme();
            render();
        });

    document
        .getElementById('settings-btn')!
        .addEventListener('click', openSettings);
}

render();
