/**
 * Type stubs for two carousel libraries that ship no declarations.
 *
 * Both are used only through their default export with props this project
 * already passes correctly, so a precise typing would be busywork. Declaring
 * them keeps `npm run typecheck` honest about the rest of the codebase instead
 * of failing on someone else's missing .d.ts.
 */
declare module 'react-responsive-masonry';
declare module 'react-slick';
