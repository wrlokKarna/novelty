import type { ElectrobunConfig } from 'electrobun';
import pkg from './package.json' with { type: 'json' };
/*
import { resolve } from "path";
import { mkdirSync, copyFileSync, existsSync, cpSync } from "fs";

const themeDir = "views/shared/theme";

function setupViews() {
	if (!existsSync(themeDir)) {
		mkdirSync(themeDir, { recursive: true });
	}
	copyFileSync(
		resolve(__dirname, "src/theme/variables.css"),
		resolve(themeDir, "variables.css"),
	);
	copyFileSync(
		resolve(__dirname, "src/theme/theme.ts"),
		resolve(themeDir, "theme.ts"),
	);
	copyFileSync(
		resolve(__dirname, "src/theme/theme.css"),
		resolve(themeDir, "theme.css"),
	);

	if (existsSync("dist")) {
		if (!existsSync("views/mainview")) {
			mkdirSync("views/mainview", { recursive: true });
		}
		if (!existsSync("views/settingsview")) {
			mkdirSync("views/settingsview", { recursive: true });
		}
		if (existsSync("dist/mainview")) {
			cpSync("dist/mainview", "views/mainview", {
				recursive: true,
				force: true,
			});
		}
		if (existsSync("dist/settingsview")) {
			cpSync("dist/settingsview", "views/settingsview", {
				recursive: true,
				force: true,
			});
		}
	}
}

setupViews();
*/

export default {
    app: {
        name: pkg.name,
        // Transforms package.json name ("novelty") into "com.yourcompany.novelty" or "novelty.app"
        identifier: `${pkg.name}.app`,
        version: pkg.version,
    },
    build: {
        mainProcess: 'bun',
        bun: {
            entrypoint: 'src/bun/index.ts',
        },
        copy: {
            'dist/mainview': 'views/mainview',
        },
        watchIgnore: ['dist/**', 'views/**'],
        mac: {
            bundleCEF: false,
        },
        linux: {
            bundleCEF: false,
        },
        win: {
            bundleCEF: false,
            icon: 'public/assets/favicon.ico',
        },
    },
} satisfies ElectrobunConfig;
