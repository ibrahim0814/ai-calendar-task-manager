# AI Calendar Task Manager - Development Guide

## Commands
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run check`: Run TypeScript type checking
- `npm run db:push`: Update database schema using Drizzle Kit

## Code Style Guidelines
- **Components**: Use functional components with proper TypeScript interfaces for props
- **Hooks**: Include all dependencies in effect/callback/memo dependency arrays
- **Imports**: Group imports (React/Next, UI components, utilities)
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files
- **Performance**: Memoize expensive calculations, use React.memo for frequently updated components
- **State Management**: Use separate states for unrelated UI elements, batch updates when possible

## UI Guidelines
- Use shadcn/ui components with consistent spacing and visual hierarchy
- Ensure proper browser compatibility (especially Safari)
- Implement custom time pickers with adequate spacing

## Error Handling
- Use try/catch for async operations with clear error messages
- Validate user input with Zod schemas