# Issue #46: User Settings & Preferences Implementation Plan

**GitHub Issue**: [#46 - User Settings & Preferences](https://github.com/user/repo/issues/46)

## Issue Analysis

### Current State
- **Problem**: Settings page shows placeholder text in German: "Diese Funktionalität wird in einer zukünftigen Version implementiert" 
- **File**: `frontend/src/pages/SettingsPage.tsx` (lines 34-35)
- **Status**: Placeholder implementation with basic MUI components

### Requirements Analysis
1. **Theme Management**: Dark/light mode with system preference detection
2. **Language Support**: German/English switching with i18n integration
3. **Query Defaults**: Timeout, concurrent requests, cache settings
4. **Export Preferences**: JSON, CSV, PDF format selection
5. **Notifications**: Success/error messages, sound alerts configuration
6. **Data Management**: Auto-delete settings, storage limits
7. **Settings Persistence**: Import/export for backup
8. **Reset Functionality**: Restore defaults
9. **Keyboard Shortcuts**: Customizable shortcuts

## Architecture Analysis

### Existing Infrastructure
- **State Management**: Zustand with persistence already implemented (`appStore.ts`)
- **Theme Support**: Basic dark mode toggle exists (`toggleDarkMode()` in appStore)
- **Persistence**: Zustand persist middleware configured for app preferences
- **Types**: `UserSettings` interface already defined in `types/app.ts` (lines 344-362)

### Current State Management Pattern
```typescript
// From appStore.ts - existing pattern
const useAppStore = create<AppStoreState>()(
  devtools(
    persist(
      (set, get) => ({...}),
      {
        name: 'ifc-app-store',
        partialize: (state) => ({ /* persisted fields */ }),
      }
    )
  )
)
```

### Identified Gaps
1. **Settings Store**: Need dedicated `settingsStore.ts` following existing Zustand pattern
2. **Settings Components**: Individual setting components (ThemeSelector, LanguageSelector, etc.)
3. **Service Layer**: `preferences.ts` service for persistence and validation
4. **Integration**: Connect new settings store with existing appStore theme functionality

## Implementation Strategy

### Phase 1: Core Infrastructure (1-2 hours) ✅
1. **Settings Store**: Create `settingsStore.ts` with Zustand + persistence ✅
2. **Service Layer**: Implement `preferences.ts` for validation and migration ✅
3. **Type Extensions**: Use existing `UserSettings` interface ✅

### Phase 2: UI Components (2-3 hours)
1. **Theme Selector**: Dark/light/auto mode with system detection
2. **Language Selector**: German/English with proper i18n
3. **Query Defaults**: Form for timeout, concurrency, cache settings
4. **Notification Settings**: Toggle controls for different notification types
5. **Data Management**: Storage limits and auto-cleanup settings

### Phase 3: Main Settings Page (1 hour)
1. **Replace Placeholder**: Remove German placeholder text
2. **Layout Implementation**: Organized sections with Material-UI
3. **Integration**: Connect all components to settings store
4. **Validation**: Real-time validation and error handling

### Phase 4: Advanced Features (1-2 hours)
1. **Import/Export**: JSON-based settings backup/restore
2. **Reset Functionality**: Restore to factory defaults
3. **Keyboard Shortcuts**: Configuration interface (optional)

## Technical Implementation Details

### Settings Store Structure ✅
```typescript
interface SettingsStoreState extends UserSettings {
  // Actions
  updateTheme: (theme: 'light' | 'dark' | 'auto') => void;
  updateLanguage: (language: 'de' | 'en') => void;
  updateQueryDefaults: (settings: Partial<QueryDefaults>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  
  // Advanced
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;
  resetToDefaults: () => void;
  
  // Initialization
  initialize: () => void;
}
```

### Integration Points
1. **App Store**: Connect theme changes to existing `darkMode` state
2. **i18n**: Integrate with existing localization system (if any)
3. **Query Store**: Connect query defaults to current query form state
4. **API Layer**: Prepare for optional backend integration

### Component Architecture
```
SettingsPage
├── ThemeSelector (theme switching)
├── LanguageSelector (i18n integration)
├── QueryDefaultsSection
│   ├── TimeoutControl
│   ├── ConcurrencyControl
│   └── CacheControl
├── NotificationSection
│   ├── NotificationToggle (multiple types)
│   └── SoundAlertToggle
├── DataManagementSection
│   ├── StorageLimitControl
│   └── AutoDeleteToggle
└── AdvancedSection
    ├── ImportExportControls
    ├── ResetButton
    └── KeyboardShortcuts (optional)
```

## Progress Status

### Phase 1: Core Infrastructure ✅ COMPLETED
- [x] `settingsStore.ts` - Complete Zustand store implementation
- [x] `preferences.ts` - Validation and utility service
- [x] Store exports updated in `index.ts`
- [x] Comprehensive implementation plan documented

### Phase 2: UI Components (Next)
- [ ] Theme Selector component
- [ ] Language Selector component  
- [ ] Query Defaults components
- [ ] Notification Settings components
- [ ] Data Management components

### Phase 3: Settings Page Integration
- [ ] Replace placeholder SettingsPage
- [ ] Connect components to store
- [ ] Layout and validation

### Phase 4: Advanced Features
- [ ] Import/Export functionality
- [ ] Reset to defaults
- [ ] Optional keyboard shortcuts

## Acceptance Criteria Mapping

- [x] **Understanding**: Current state analyzed, architecture mapped
- [ ] **Replace Placeholder**: Remove German placeholder text → Phase 3
- [ ] **Theme Switching**: Dark/light/auto with system detection → Phase 2.1
- [ ] **Language Preferences**: German/English with i18n → Phase 2.2
- [ ] **Query Defaults**: Timeout, concurrency, cache → Phase 2.3
- [ ] **Export Preferences**: JSON, CSV, PDF formats → Phase 2.3
- [ ] **Notification Settings**: Toggle controls → Phase 2.4
- [ ] **Data Management**: Auto-delete, storage limits → Phase 2.5
- [ ] **Import/Export**: Settings backup → Phase 4.1
- [ ] **Reset Functionality**: Restore defaults → Phase 4.2
- [ ] **Keyboard Shortcuts**: Configuration interface → Phase 4.3 (optional)

## Next Steps

1. **Start Phase 2**: Begin with ThemeSelector component
2. **Integration**: Connect theme changes with existing appStore.darkMode
3. **Testing**: Implement settings validation and persistence testing

This implementation will transform the placeholder Settings page into a fully functional user preferences system that integrates seamlessly with the existing application architecture.