# AGENTS.md

## Commands

- `bun dev` - Run electrobun dev in watch mode
- `bun dev:edge` - Run electrobun dev in watch mode using hutch-canary
- `bun dev:hmr` - Run Vite HMR (port 5173) and start concurrently
- `bun start` - Build Vite app then run electrobun dev
- `bun start:edge` - Build Vite app then run electrobun dev using hutch-canary
- `bun hmr` - Run Vite for HMR on port 5173 with host enabled
- `bun build:canary` - Build for canary environment
- `bun build:canary:edge` - Build for canary environment using hutch-canary
- `bun type-check` - Run TypeScript type checking (`tsc --noEmit`)
- `bun lint` - Run ESLint (`bunx eslint .`)
- `bun format` - Format code using Prettier
- `bun format:check` - Check code formatting with Prettier

## Architecture

- **Framework**: Electrobun (v1.18.1) with React 18 + TypeScript + Vite 6
- **Database**: Drizzle ORM (`^0.39.3`) with `sqlite-vec` support
- **UI Libraries**: Novel, Framer Motion, Tabler Icons, Vis Timeline, React Router Dom
- **Entry points**: React app in `src/mainview/`
- **Vite root**: `src/` (not project root)

## Key Quirks

- Vite config `root: "src"` means config references relative to `src/`
- Build outputs to `dist/` with no code splitting (manualChunks disabled)
- The `fix-electrobun-paths` plugin rewrites relative paths in output HTML
- Linting, type-checking, and formatting scripts are fully configured and ready to run (`bun lint`, `bun type-check`, `bun format`)

## Dependencies

Run `bun install` (or `npm install`) after pulling changes.
