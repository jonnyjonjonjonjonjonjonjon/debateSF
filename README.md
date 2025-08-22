# Minimalist Debate Mapper

A React-based debate mapping tool with nested per-parent layout and clean design system integration.

## Features

- **Nested Per-Parent Rows**: Children render within parent columns, no global depth grid
- **Equal-Width Siblings**: Zero visual gaps, sharp 90° corners
- **Accordion Navigation**: Only one block expanded globally
- **Client-Only Drafts**: Confirm commits, Cancel discards
- **Edit Mode**: Agree→parent edit mode with Save/Cancel/Delete
- **History & Restore**: Version tracking with restoration
- **Design System**: JSON-driven styling with HSL color helpers
- **Responsive & Accessible**: Supports reduced motion preferences

## Quick Start

### Terminal A - Backend
```bash
cd backend
npm install
npm run dev
```

### Terminal B - Frontend  
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (proxies /api → http://localhost:3001)

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind + Zustand
- **Backend**: Node + Express + TypeScript (in-memory storage)
- **Design System**: JSON tokens → CSS variables + HSL helpers
- **Layout**: CSS Grid/Flex only, no absolute positioning

## Key Files

- `docs/` - Complete specifications
- `design/debate-design-system.json` - Design tokens
- `frontend/src/design/tokens.ts` - CSS variable generation
- `frontend/src/components/Tree.tsx` - Nested layout implementation
- `backend/src/routes/debate.ts` - API endpoints

## Testing

All user flows per `docs/ACCEPTANCE.md` should pass end-to-end.
