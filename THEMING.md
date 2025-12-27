# Theming Implementation Guide

## Overview

This document describes the dark mode and theming system implemented across the PMP Study App platforms (Web, Mobile, and Backend services).

## Web (Next.js + React)

### Dark Mode Support

#### ThemeContext (web/src/contexts/ThemeContext.tsx)
- Manages application theme state (light, dark, system)
- Persists theme preference to localStorage
- Listens to system theme changes
- Applies theme via `dark` class on HTML element

#### Features
- **Three Theme Modes:**
  - `light`: Always use light theme
  - `dark`: Always use dark theme
  - `system`: Follow system preference (default)

- **Theme Persistence:** User's selection is saved to localStorage
- **System Preference Detection:** Automatically detects OS-level dark mode preference
- **Real-time Updates:** Listens to system theme changes and updates accordingly

#### Usage

```tsx
import { useTheme } from '@/contexts/ThemeContext'

export function MyComponent() {
  const { isDark, toggleTheme, setTheme, theme } = useTheme()

  return (
    <div>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      {isDark ? 'Currently in dark mode' : 'Currently in light mode'}
    </div>
  )
}
```

### Tailwind CSS Dark Mode

#### Global Styles (web/src/app/globals.css)
- Uses Tailwind's `dark:` prefix for dark mode styles
- Smooth color transitions (300ms duration)
- Sets `color-scheme: dark` for native elements

#### Component Styling Example

```html
<!-- Light mode: white bg, dark text -->
<!-- Dark mode: dark bg, light text -->
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

#### Available Component Classes
- `.btn-primary`: Primary button with dark mode support
- `.btn-secondary`: Secondary button
- `.btn-google`: Google auth button
- `.input-field`: Form input field
- `.card`: Card component
- `.error-box`: Error alert
- `.warning-box`: Warning alert
- `.success-box`: Success alert
- `.info-box`: Info alert
- `.skeleton`: Loading skeleton

### UI Components

#### ThemeToggle (web/src/components/ThemeToggle.tsx)
Provides a button to toggle between light/dark/system themes.

```tsx
import { ThemeToggle } from '@/components/ThemeToggle'

export function Navbar() {
  return (
    <nav>
      <ThemeToggle />
    </nav>
  )
}
```

#### LoadingSpinner (web/src/components/LoadingSpinner.tsx)
Animated loading spinner with dark mode support.

```tsx
import { LoadingSpinner } from '@/components/LoadingSpinner'

<LoadingSpinner size="md" />
```

#### SkeletonLoader (web/src/components/SkeletonLoader.tsx)
Skeleton placeholder for loading states.

```tsx
import { SkeletonLoader } from '@/components/SkeletonLoader'

<SkeletonLoader count={3} type="card" />
```

#### ErrorAlert (web/src/components/ErrorAlert.tsx)
Dismissible error/warning/success/info alerts.

```tsx
import { ErrorAlert } from '@/components/ErrorAlert'

<ErrorAlert
  error="Failed to load data"
  type="error"
  onDismiss={() => setError(null)}
/>
```

## Mobile (Flutter)

### Dark Mode Support

#### ThemeProvider (flutter/lib/providers/theme_provider.dart)
Riverpod-based state management for theme selection.

- Manages theme mode (light/dark/system)
- Persists preference to SharedPreferences
- Provides `toggleTheme()` and `setTheme()` methods

#### AppTheme (flutter/lib/theme/app_theme.dart)
Comprehensive Material 3 theme definitions for both light and dark modes.

#### Features
- **Light Theme:** White backgrounds, dark text
- **Dark Theme:** Dark surfaces (#121212, #1E1E1E), light text
- **Consistent Colors:**
  - Primary: #1976D2 (Blue)
  - Secondary: #424242 (Light Gray) / #BDBDBD (Dark Gray)
  - Error: #E53935 (Red)
- **Google Fonts:** Roboto font family throughout

### UI Components

#### LoadingSpinner (flutter/lib/widgets/loading_widgets.dart)
```dart
LoadingSpinner(
  size: 40,
  color: Colors.blue[600],
)
```

#### SkeletonLoader (flutter/lib/widgets/loading_widgets.dart)
```dart
SkeletonLoader(
  width: 100,
  height: 20,
  borderRadius: BorderRadius.circular(4),
)
```

#### SkeletonCard (flutter/lib/widgets/loading_widgets.dart)
Pre-built skeleton card layout for loading states.

```dart
SkeletonCard(padding: EdgeInsets.all(16))
```

#### ErrorAlert (flutter/lib/widgets/error_widgets.dart)
```dart
ErrorAlert(
  message: 'Error message',
  type: AlertType.error,
  onDismiss: () {},
  showIcon: true,
)
```

#### ErrorScreen (flutter/lib/widgets/error_widgets.dart)
Full-screen error display with optional retry button.

```dart
ErrorScreen(
  title: 'Connection Error',
  message: 'Failed to connect to server',
  onRetry: () {},
)
```

#### ThemeToggle (flutter/lib/widgets/theme_toggle.dart)
Quick toggle button in AppBar.

```dart
AppBar(
  actions: [
    ThemeToggle(),
  ],
)
```

#### ThemeSelector (flutter/lib/widgets/theme_toggle.dart)
Full theme selection dialog.

```dart
showDialog(
  context: context,
  builder: (context) => ThemeSelector(),
)
```

## Backend (Firebase)

No theme management is required on the backend. Theme is purely a client-side concern and stored locally.

## Color Palette Reference

### Light Mode
- Background: White (#FFFFFF)
- Surface: White (#FFFFFF)
- Text Primary: #1F2937 (Dark Gray)
- Text Secondary: #6B7280 (Medium Gray)
- Primary: #1976D2 (Blue)
- Secondary: #424242 (Dark Gray)
- Error: #E53935 (Red)
- Success: #43A047 (Green)
- Warning: #FDD835 (Yellow)

### Dark Mode
- Background: #121212 (Near Black)
- Surface: #1E1E1E (Dark Gray)
- Text Primary: #FFFFFF (White)
- Text Secondary: #B3B3B3 (Light Gray)
- Primary: #1976D2 (Blue) - unchanged
- Secondary: #BDBDBD (Light Gray)
- Error: #E53935 (Red) - unchanged
- Success: #43A047 (Green) - unchanged
- Warning: #FDD835 (Yellow) - unchanged

## Implementation Best Practices

### Web
1. Always use `dark:` prefix for dark mode styles
2. Place ThemeProvider as early as possible in component tree
3. Use `useTheme()` hook instead of accessing context directly
4. Test with `prefers-color-scheme` media query

### Mobile
1. Use Material 3 color schemes consistently
2. Always provide color contrast ratios ≥ 4.5:1 for text
3. Use Riverpod providers for theme state
4. Test on both real devices and emulators

### Cross-Platform
1. Keep color palettes consistent between web and mobile
2. Use the same theme persistence strategy (localStorage for web, SharedPreferences for Flutter)
3. Support system theme detection on both platforms
4. Provide user control to override system preference

## Testing

### Web
```bash
# Test dark mode with DevTools
# CSS > Emulate dark scheme
# Or: Ctrl+Shift+P > Dark theme
```

### Mobile (Flutter)
```bash
# Test light theme
flutter run --web --web-renderer html -d chrome --dart-define=theme_mode=light

# Test dark theme
flutter run --web --web-renderer html -d chrome --dart-define=theme_mode=dark
```

## Performance Considerations

1. **Web:** Theme changes trigger minimal repaints due to CSS class toggling
2. **Mobile:** ThemeMode changes rebuild only affected widgets
3. **No localStorage thrashing:** Theme only written on explicit user action
4. **System detection:** Debounced media query listener prevents excessive updates

## Accessibility

- All colors meet WCAG AA contrast requirements (4.5:1 minimum)
- Loading states provide visual feedback
- Error states are clearly distinguishable by color AND icon
- Text remains readable in both light and dark modes
