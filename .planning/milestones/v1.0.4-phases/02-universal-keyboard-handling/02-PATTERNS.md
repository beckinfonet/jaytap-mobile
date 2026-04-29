# Phase 2: Universal Keyboard Handling - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 14 (3 config / project-root + 1 component + 10 screen sites across 9 screen files)
**Analogs found:** 14 / 14 — every modified file is its own analog (in-place edit phase). No new file scaffolding required.

---

## Phase Shape Caveat

Phase 2 is **almost entirely in-place edits** — there are zero new source files. For every modified file the "closest analog" IS the file itself (current state, captured below as the verbatim BEFORE-diff). The pattern callouts focus on:

1. The exact JSX/text region that the executor will replace.
2. The shared shape that recurs across multiple files (auth screens, chat screens) so the planner can batch tasks.
3. Load-bearing ordering constraints (Babel plugin LAST, provider tree slot, RN built-in import removal).

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality | Edit Type |
|------|------|-----------|----------------|---------------|-----------|
| `package.json` | config (npm) | dependency graph | self | exact | append 3 deps |
| `babel.config.js` | config (build) | transform pipeline | self | exact | add `plugins` array (1 entry, MUST be last) |
| `ios/Podfile` | config (native deps) | native module link | self (no source edit) | exact | NO edit; `pod install` regenerates `Podfile.lock` |
| `App.tsx` | root provider tree | render tree | self | exact | insert `<KeyboardProvider>` between `SafeAreaProvider` and `ThemeProvider` |
| `src/screens/LoginScreen.tsx` | screen (auth) | request-response (form submit) | self + sibling auth screens | exact | wrap content in `KeyboardAwareScrollView` |
| `src/screens/SignupScreen.tsx` | screen (auth) | request-response (form submit) | `LoginScreen.tsx` | exact (same shape) | wrap content in `KeyboardAwareScrollView` |
| `src/screens/ForgotPasswordScreen.tsx` | screen (auth) | request-response (form submit) | `LoginScreen.tsx` | exact (same shape) | wrap content in `KeyboardAwareScrollView` |
| `src/screens/ResetPasswordScreen.tsx` | screen (auth) | request-response (form submit) | `LoginScreen.tsx` | exact (same shape) | wrap content in `KeyboardAwareScrollView` |
| `src/screens/CreateListingScreen.tsx` (line 455 admin-verify) | screen (form) | CRUD (admin write) | self (already a `ScrollView`) | exact | rename element `ScrollView` → `KeyboardAwareScrollView` |
| `src/screens/CreateListingScreen.tsx` (line 497 main form) | screen (form) | CRUD (listing create/edit) | self (already a `ScrollView`) | exact | rename element `ScrollView` → `KeyboardAwareScrollView` |
| `src/screens/AccountSettingsScreen.tsx` (line 150) | screen (settings) | CRUD (user profile update) | self | exact | rename element `ScrollView` → `KeyboardAwareScrollView` |
| `src/screens/ChatThreadScreen.tsx` (line 183) | screen (messaging) | streaming (chat composer) | self + `ChatComposeScreen.tsx` | exact (twin file) | swap import source for `KeyboardAvoidingView`; remove `behavior` + `keyboardVerticalOffset` props |
| `src/screens/ChatComposeScreen.tsx` (line 114) | screen (messaging) | request-response (first message) | `ChatThreadScreen.tsx` | exact (twin file) | swap import source for `KeyboardAvoidingView`; remove `behavior` + `keyboardVerticalOffset` props |
| `src/screens/HomeScreen.tsx` (line 465) | screen (list) | event-driven (search filter) | self | exact | discretionary — strip workaround comment after device verify |
| `src/components/PasswordTextInput.tsx` | component (input wrapper) | controlled-input passthrough | self | exact | NO edit expected — verify-only |

---

## Pattern Assignments

### `package.json` (config, dependency graph)

**Analog:** self (current state, BEFORE Phase 2 diff)

**Verbatim — current `dependencies` block** (`package.json:13-28`):

```json
"dependencies": {
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-community/datetimepicker": "^8.6.0",
  "@react-native/new-app-screen": "0.84.0",
  "axios": "^1.13.5",
  "lucide-react-native": "^0.564.0",
  "react": "19.2.3",
  "react-native": "0.84.0",
  "react-native-image-picker": "^8.2.1",
  "react-native-linear-gradient": "^2.8.3",
  "react-native-maps": "1.27.1",
  "react-native-safe-area-context": "^5.5.2",
  "react-native-svg": "^15.15.3",
  "react-native-webview": "^13.16.0",
  "socket.io-client": "^4.8.3"
}
```

**Confirmed absent** (per CONTEXT D-02 + verified via `grep -c "react-native-reanimated" package.json` → 0):
- `react-native-reanimated`
- `react-native-worklets`
- `react-native-keyboard-controller`

**Pattern callout:** existing dep block is alphabetized. Per RESEARCH §2.1, `npm install react-native-reanimated react-native-worklets` (Wave 0 step 2) and `npm install react-native-keyboard-controller` (Wave 0 step 6) will append entries; npm preserves alphabetical order on install. Final state should slot:
- `react-native-keyboard-controller` between `image-picker` and `linear-gradient`
- `react-native-reanimated` between `safe-area-context` and `svg`
- `react-native-worklets` between `webview` and `socket.io-client`

The planner does NOT hand-edit `package.json` — npm CLI does. Document the expected alphabetized result in the plan so the verifier can spot anomalies.

---

### `babel.config.js` (config, transform pipeline)

**Analog:** self (current state, BEFORE Phase 2 diff)

**Verbatim — current full file** (`babel.config.js:1-3`):

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
```

**Pattern callout — LOAD-BEARING ORDER:**

The current file has **no `plugins` array at all.** Phase 2 introduces one, with the worklets plugin as the **only** entry. Future Babel additions go ABOVE worklets — `'react-native-worklets/plugin'` must always be last (RESEARCH §2.3, L2).

Expected after edit (per RESEARCH §2.3 verbatim):

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets/plugin', // MUST be last; reanimated v4 ships its plugin here
  ],
};
```

The `// MUST be last` comment IS the pattern — it's documentation-as-load-bearing, intended to prevent a future contributor from appending another plugin below it.

---

### `ios/Podfile` (config, native module link)

**Analog:** self (no source edit)

**Verbatim — current full file** (`ios/Podfile:1-35`):

```ruby
# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

platform :ios, min_ios_version_supported
prepare_react_native_project!

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end

target 'JayTap' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      # :ccache_enabled => true
    )
  end
end
```

**Pattern callout — DO NOT EDIT.**

`use_native_modules!` (line 18) auto-discovers RN native modules from `node_modules/*/RNKeyboardController.podspec` (and reanimated equivalents) without any manual `pod 'X'` line. Phase 2's iOS work is exclusively `cd ios && pod install` — that command regenerates `Podfile.lock`, downloads pods to `ios/Pods/`, and updates `JayTap.xcworkspace`. None of those changes touch `Podfile` itself.

If a planner or executor proposes adding an explicit `pod 'react-native-keyboard-controller'` entry, REJECT — that's the legacy (pre-autolinking) pattern and would conflict with `use_native_modules!`.

---

### `App.tsx` (root provider tree)

**Analog:** self

**Verbatim — current `App` function** (`App.tsx:948-960`):

```tsx
function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

**Verbatim — current import block (relevant lines)** (`App.tsx:1-3, 23-25`):

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator, Linking, Alert, BackHandler, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ... screen imports lines 4-22 ...
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
```

**Pattern callout — provider order is locked:**

Per CONTEXT D-03 + CLAUDE.md "Key Conventions", the existing `SafeAreaProvider → ThemeProvider → LanguageProvider → AuthProvider` order is **preserved verbatim**. `KeyboardProvider` slots EXACTLY between `SafeAreaProvider` and `ThemeProvider`:

Expected after Wave 1 (showing the expected target — for the planner's diff specification):

```tsx
function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
```

And the import is added in **import group 2** (third-party RN modules), adjacent to the existing `react-native-safe-area-context` line:

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
```

**Why this matters:** PITFALLS §Pitfall 2 explicitly warns that misplaced `KeyboardProvider` (e.g. inside `ThemeProvider` instead of outside) makes EVERY downstream library component (KASV, KAV) **silently no-op** — no warning, no red box, just nothing happens when the keyboard appears. The `<SafeAreaProvider>...<ThemeProvider>` boundary is a 4-line region; the executor must NOT slot `KeyboardProvider` anywhere else.

---

### Auth Screen Pattern (LoginScreen / SignupScreen / ForgotPasswordScreen / ResetPasswordScreen)

**Shared structural template:** all 4 auth screens have the same outer JSX shape:

```tsx
<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
  {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
  <View style={styles.header}>...</View>
  <View style={styles.content}>
    {/* TextInput(s) + submit button */}
  </View>
</SafeAreaView>
```

And all 4 use the same `styles.container` shape:

```tsx
container: {
  flex: 1,
  padding: 20,
  justifyContent: 'center',
}
```

The KASV wrap target is the `<View style={styles.header}>` + `<View style={styles.content}>` pair, with `<AuthModalCloseButton>` left as a sibling outside KASV (per RESEARCH §3.2 step 3).

#### `src/screens/LoginScreen.tsx` (screen, auth — request-response)

**Analog:** self

**Verbatim — current outer JSX** (`LoginScreen.tsx:48-115`):

```tsx
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.welcomeBack')}</Text>
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('auth.signInToContinue')}</Text>
    </View>

    <View style={styles.content}>
      {errorMessage ? (...) : null}

      <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, ... }]}
            placeholder={t('auth.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
      </View>

      <View style={styles.inputContainer}>
          <PasswordTextInput
            style={[styles.input, { ... }]}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
          />
      </View>

      <TouchableOpacity ...forgot password row.../>
      <TouchableOpacity ...signIn submit.../>
      <TouchableOpacity ...signUp link.../>
    </View>
  </SafeAreaView>
);
```

**Imports** (`LoginScreen.tsx:1-8`):

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';
import { PasswordTextInput } from '../components/PasswordTextInput';
```

**No `KeyboardAvoidingView`, no `ScrollView` today.** The screen relies on `justifyContent: 'center'` to position the form vertically. Per RESEARCH §3.2 the KASV wrapper should set `contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}` so the visual layout is unchanged when keyboard is closed.

#### `src/screens/SignupScreen.tsx` (screen, auth)

**Analog:** `LoginScreen.tsx` (twin shape) — and self.

**Verbatim — current outer JSX** (`SignupScreen.tsx:53-135`):

```tsx
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.createAccountTitle')}</Text>
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('auth.signUpToGetStarted')}</Text>
    </View>

    <View style={styles.content}>
      {errorMessage ? (...) : null}

      <View style={styles.inputContainer}>  {/* email TextInput */} </View>
      <View style={styles.inputContainer}>  {/* PasswordTextInput */} </View>

      <PasswordRequirements password={password} />

      <View style={styles.inputContainer}>  {/* confirm PasswordTextInput */} </View>

      <TouchableOpacity ...signUp submit.../>
      <TouchableOpacity ...signIn link.../>
    </View>
  </SafeAreaView>
);
```

**Imports** (`SignupScreen.tsx:1-10`):

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { PasswordTextInput } from '../components/PasswordTextInput';
import { passwordMeetsPolicy } from '../utils/passwordPolicy';
```

Same `styles.container` shape as LoginScreen. Same wrapping treatment.

#### `src/screens/ForgotPasswordScreen.tsx` (screen, auth)

**Analog:** `LoginScreen.tsx` (twin shape) — and self.

**Verbatim — current outer JSX** (`ForgotPasswordScreen.tsx:64-148`):

```tsx
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}

    <View style={styles.header}>...</View>

    <View style={styles.content}>
      {sent ? (
        <>...success state with CheckCircle icon + button + link...</>
      ) : (
        <>
          <View style={styles.mailIconWrap}>
            <View style={[styles.iconCircle, ...]}>
              <Mail size={32} color={colors.primary} />
            </View>
          </View>
          {errorMessage ? (...) : null}
          <View style={styles.inputContainer}>
            <TextInput
              ...
              placeholder={t('auth.email')}
              autoFocus
              ...
            />
          </View>
          <TouchableOpacity ...sendResetLink submit.../>
          <TouchableOpacity ...backToSignIn link.../>
        </>
      )}
    </View>
  </SafeAreaView>
);
```

**Imports** (`ForgotPasswordScreen.tsx:1-9`):

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import type { TranslationKeys } from '../locales';
import { CheckCircle, Mail } from 'lucide-react-native';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';
```

**Pattern note:** `autoFocus` on the email TextInput (line 122) means the keyboard pops immediately when the screen renders — KASV must handle the initial-focus case correctly. Verify on physical device (D-12 Tier 1 row 3).

#### `src/screens/ResetPasswordScreen.tsx` (screen, auth)

**Analog:** `LoginScreen.tsx` (twin shape) — and self.

**Verbatim — current outer JSX (truncated for clarity)** (`ResetPasswordScreen.tsx:91-191`):

```tsx
return (
  <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    {onClose ? <AuthModalCloseButton onPress={onClose} /> : null}

    <View style={styles.header}>...</View>

    <View style={styles.content}>
      <View style={styles.keyIconWrap}>
        <View style={[styles.iconCircle, ...]}>
          <KeyRound size={30} color={colors.primary} />
        </View>
      </View>

      {errorMessage ? (...) : null}

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, styles.linkInput, { ... }]}
          placeholder={t('auth.resetLinkOrCodePlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          multiline                           {/* ⚠️ multiline TextInput — see L10 in RESEARCH §8 */}
          value={linkOrCode}
          onChangeText={setLinkOrCode}
          ...
        />
      </View>

      <View style={styles.inputContainer}>  {/* PasswordTextInput — newPassword */} </View>

      <PasswordRequirements password={password} />

      <View style={styles.inputContainer}>  {/* PasswordTextInput — confirm */} </View>

      <TouchableOpacity ...saveNewPassword submit.../>
      <TouchableOpacity ...backToSignIn link.../>
    </View>
  </SafeAreaView>
);
```

**Imports** (`ResetPasswordScreen.tsx:1-13`):

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthService } from '../services/AuthService';
import { parseOobCodeFromResetInput } from '../utils/parseOobCode';
import type { TranslationKeys } from '../locales';
import { KeyRound } from 'lucide-react-native';
import { AuthModalCloseButton } from '../components/AuthModalCloseButton';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { PasswordTextInput } from '../components/PasswordTextInput';
import { passwordMeetsPolicy } from '../utils/passwordPolicy';
```

**Pattern note (load-bearing for verification):** the `linkOrCode` TextInput at line 113-132 is `multiline` with `minHeight: 88` and `textAlignVertical: 'top'`. RESEARCH §8 L10 ("Multiline TextInputs inside ScrollView under Fabric refuse to grow") flags this as a verify-point. After KASV wrap, confirm during D-12 Tier 1 row 4 that pasting a long reset link still grows the field.

---

### `src/screens/CreateListingScreen.tsx` — TWO ScrollView sites (D-07)

**Analog:** self. Both sites already use `<ScrollView>` with a `style + contentContainerStyle` props pair — KASV inherits these props verbatim (per CONTEXT "Reusable Assets" + library API).

**Verbatim — Branch A (admin-verify, line 455)** (`CreateListingScreen.tsx:455-477`):

```tsx
<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
  <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 16 }]}>
    {propertyToEdit?.title ? propertyToEdit.title : ''}
  </Text>
  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>{t('verification.adminSectionTitle')}</Text>
  <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 20 }]}>{t('verification.adminSectionHint')}</Text>
  {verificationSwitchRow(t('verification.ownershipDocuments'), verifyOwnership, setVerifyOwnership)}
  {verificationSwitchRow(t('verification.ownerIdentity'), verifyOwnerId, setVerifyOwnerId)}
  {verificationSwitchRow(t('verification.stateIssued'), verifyStateDocs, setVerifyStateDocs)}
  <TouchableOpacity
    style={[styles.submitButton, { backgroundColor: colors.primary }]}
    onPress={handleSubmit}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator color="#FFF" />
    ) : (
      <Text style={[styles.submitButtonText, { color: isDark ? '#121212' : '#FFFFFF' }]}>
        {t('verification.save')}
      </Text>
    )}
  </TouchableOpacity>
</ScrollView>
```

**Verbatim — Branch B (main listing form, line 497)** (`CreateListingScreen.tsx:497-501`):

```tsx
<ScrollView
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
  showsVerticalScrollIndicator={false}
>
  {/* Transaction Type section + 19 TextInputs across nested sections — closes at line 956 */}
</ScrollView>
```

**Verbatim — `styles.scrollView` + `styles.scrollContent`** (`CreateListingScreen.tsx:990-996`):

```tsx
scrollView: {
  flex: 1,
},
scrollContent: {
  padding: 20,
  paddingBottom: 40,
},
```

**Verbatim — current import block (relevant lines)** (`CreateListingScreen.tsx:1-25`):

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
// ... context/service imports lines 20-25 ...
```

**Pattern callout — internal structure NOT touched (D-07):**

`grep -n "ScrollView\|FlatList" CreateListingScreen.tsx` returns 6 matches:

```
6:  ScrollView,        ← import line
15:  FlatList,         ← import line (FlatList is used internally)
455: <ScrollView ...>  ← Branch A (convert to KASV)
477: </ScrollView>     ← Branch A close
497: <ScrollView ...>  ← Branch B (convert to KASV)
956: </ScrollView>     ← Branch B close
```

There are **no nested top-level `ScrollView`s inside the main form** — the file uses `FlatList` internally (likely for image picker rows) which is fine; per D-04 the banned mix is "KASV nested inside ScrollView," not "FlatList inside KASV." However the planner should re-grep before merging to confirm no `ScrollView` line was added by an unrelated commit between now and execution.

**Pattern callout — `ScrollView` import retention:**

Removing `ScrollView` from the `react-native` import (line 6) is safe ONLY if no other code in the file uses it. Verified: the only two uses are at lines 455 and 497 (both being converted). After conversion, `ScrollView` can be dropped from the import. `FlatList` (line 15) STAYS — it's used internally.

---

### `src/screens/AccountSettingsScreen.tsx` (screen, settings — CRUD)

**Analog:** self.

**Verbatim — current ScrollView opening tag** (`AccountSettingsScreen.tsx:150`):

```tsx
<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
```

**Closes at line 305.**

**Verbatim — current import block (relevant lines)** (`AccountSettingsScreen.tsx:1-15`):

```tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    ScrollView,
    Switch,
    ActivityIndicator,
    Animated,
    LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
```

**Pattern callout — cleanest swap in the phase:** one element rename (open + close tags) + import swap. Per RESEARCH §3.3 add `keyboardShouldPersistTaps="handled"` and `bottomOffset={20}` for parity with auth screens. Verify `ScrollView` has no other use in the file before removing from the `react-native` import (`grep -n "ScrollView" AccountSettingsScreen.tsx` shows 3 matches: import line 9, opening tag 150, closing tag 305 — safe to remove).

---

### Chat Screen Pattern (ChatThreadScreen / ChatComposeScreen) — RN KAV → library KAV (D-09)

**Shared anti-pattern:** both files import `KeyboardAvoidingView` from `'react-native'` and pass the load-bearing-magic-number `keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}` prop. Per CONTEXT D-09, the migration is identical for both files: ~5 lines changed each.

#### `src/screens/ChatThreadScreen.tsx` (screen, messaging — streaming composer)

**Analog:** self + `ChatComposeScreen.tsx` (twin file).

**Verbatim — current import block (relevant lines)** (`ChatThreadScreen.tsx:1-13`):

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,         {/* ← REMOVE this from RN import */}
  Platform,                       {/* ← KEEP — Platform may still be used elsewhere; grep before delete */}
} from 'react-native';
```

**Verbatim — current `<KeyboardAvoidingView>` opening tag** (`ChatThreadScreen.tsx:183-187`):

```tsx
<KeyboardAvoidingView
  style={styles.keyboardView}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
```

**Verbatim — wrapped composer body** (`ChatThreadScreen.tsx:188-219`):

```tsx
<FlatList
  ref={flatListRef}
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={renderMessage}
  contentContainerStyle={styles.messagesList}
  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
/>
<View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
  <TextInput
    style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground }]}
    placeholder="Type a message..."
    placeholderTextColor={colors.textSecondary}
    value={inputText}
    onChangeText={setInputText}
    multiline                        {/* ⚠️ multiline composer — verify L10 doesn't bite */}
    maxLength={2000}
    editable={!sending}
  />
  <TouchableOpacity
    style={[styles.sendButton, { backgroundColor: colors.accent }]}
    onPress={handleSend}
    disabled={!inputText.trim() || sending}
  >
    {sending ? (
      <ActivityIndicator size="small" color="#FFF" />
    ) : (
      <Send size={20} color="#FFF" />
    )}
  </TouchableOpacity>
</View>
</KeyboardAvoidingView>
```

**Pattern callout — `Platform` import retention:** before removing `Platform` from the RN import, the executor MUST `grep -n "Platform\." ChatThreadScreen.tsx` to confirm no other `Platform.OS` usage remains. If `Platform.OS` is referenced elsewhere (likely — many RN screens reference it for keyboard/UI logic), KEEP `Platform` in the import. The only guaranteed removal is `KeyboardAvoidingView`.

#### `src/screens/ChatComposeScreen.tsx` (screen, messaging — request-response first message)

**Analog:** `ChatThreadScreen.tsx` (twin file) + self.

**Verbatim — current import block (relevant lines)** (`ChatComposeScreen.tsx:1-13`):

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,         {/* ← REMOVE this from RN import */}
  Platform,                       {/* ← grep before delete (likely needed elsewhere) */}
  Image,
} from 'react-native';
```

**Verbatim — current `<KeyboardAvoidingView>` opening tag** (`ChatComposeScreen.tsx:114-118`):

```tsx
<KeyboardAvoidingView
  style={styles.keyboardView}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
```

**Verbatim — wrapped composer body** (`ChatComposeScreen.tsx:119-142`):

```tsx
<View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
  <TextInput
    style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground }]}
    placeholder="Type your message..."
    placeholderTextColor={colors.textSecondary}
    value={inputText}
    onChangeText={setInputText}
    multiline                        {/* ⚠️ multiline composer — verify L10 doesn't bite */}
    maxLength={2000}
    editable={!sending}
  />
  <TouchableOpacity
    style={[styles.sendButton, { backgroundColor: colors.accent }]}
    onPress={handleSend}
    disabled={!inputText.trim() || sending}
  >
    {sending ? (
      <ActivityIndicator size="small" color="#FFF" />
    ) : (
      <Send size={20} color="#FFF" />
    )}
  </TouchableOpacity>
</View>
</KeyboardAvoidingView>
```

**Pattern callout — props REMOVED, not changed:**

Per CONTEXT D-09 + RESEARCH §3.5 the migration is:

```diff
- import { ... KeyboardAvoidingView, Platform, ... } from 'react-native';
+ import { ... Platform, ... } from 'react-native';        // KAV removed; Platform kept if still used
+ import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

- <KeyboardAvoidingView
-   style={styles.keyboardView}
-   behavior={Platform.OS === 'ios' ? 'padding' : undefined}
-   keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
- >
+ <KeyboardAvoidingView style={styles.keyboardView}>
```

The library's KAV defaults handle behavior + offset based on `KeyboardProvider`'s frame events. Re-introducing `keyboardVerticalOffset` to fix any visual issue is **expressly out of scope** (KBD-02; §6 SC3 grep gate). If the device verify shows a 1-2px gap, fix via `paddingBottom` on `styles.inputRow` — NOT via the offset prop.

---

### `src/screens/HomeScreen.tsx` (screen, list — discretionary cleanup)

**Analog:** self.

**Verbatim — current search bar block** (`HomeScreen.tsx:302-317`):

```tsx
{/* Search Bar + Filter Icon Row */}
<View style={styles.searchRow}>
  <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
    <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
    <TextInput
      key="search-input"
      style={[styles.searchInput, { color: colors.text }]}
      placeholder={t('home.searchPlaceholder')}
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholderTextColor={colors.textSecondary}
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
    />
  </View>
  <TouchableOpacity ...filter button.../>
```

**Verbatim — current workaround region** (`HomeScreen.tsx:459-483`):

```tsx
{loading ? (
  <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
) : (
  <View style={styles.contentContainer}>
    {/* Header outside FlatList to prevent TextInput focus issues */}
    {renderHeaderContent()}
    <FlatList
      data={filteredProperties}
      keyExtractor={(item, index) => item.id || item.listingId || `property-${index}`}
      renderItem={({ item }) => (
        <PropertyCard
          property={item}
          onPress={handlePressProperty}
          onViewTour={handleViewTour}
          onViewVideo={handleViewVideo}
          onFavorite={onFavorite}
          isFavorited={favoriteStatuses[item.id] || false}
          isLoading={favoriteLoading[item.id] || false}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
```

**Pattern callout — what "cleanup" means concretely:**

The "workaround" is **structural** (header rendered as a sibling above FlatList rather than as `ListHeaderComponent={renderHeaderContent}`) plus a **comment** documenting why. Per RESEARCH §3.6:

- DO NOT restructure to use `ListHeaderComponent` or `renderScrollComponent` in Phase 2. The search bar is in the header (outside the FlatList) — D-05's `renderScrollComponent` rule applies only when the FlatList itself contains inputs.
- The cleanup that IS opportunistically in scope: deleting just the `{/* Header outside FlatList to prevent TextInput focus issues */}` comment on line 465 AFTER device verify confirms the search bar works correctly with `KeyboardProvider`.
- If the comment is removed, leave the structural separation (`renderHeaderContent()` as a sibling) intact — it's ALSO a non-keyboard rendering choice (image-cache/perf).

**Cleanup is OPTIONAL.** If any uncertainty during D-12 Tier 2 row 10 smoke-test, defer.

---

### `src/components/PasswordTextInput.tsx` (component — verify-only, NO edit)

**Analog:** self.

**Verbatim — full file** (`PasswordTextInput.tsx:1-57`):

```tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export type PasswordTextInputProps = Omit<TextInputProps, 'secureTextEntry'>;

export function PasswordTextInput({ style, ...props }: PasswordTextInputProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[style, styles.inputPad]}
      />
      <TouchableOpacity
        style={styles.iconHit}
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        disabled={props.editable === false}
      >
        {visible ? (
          <EyeOff size={22} color={colors.textSecondary} strokeWidth={2} />
        ) : (
          <Eye size={22} color={colors.textSecondary} strokeWidth={2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputPad: {
    paddingRight: 52,
  },
  iconHit: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

**Pattern callout — why no changes are expected:**

The component is a plain `<TextInput>` wrapped in a relative-positioned `<View>` with an absolute-positioned eye icon overlay. KASV finds the focused input via React Native's `currentlyFocused()` API, which returns the underlying TextInput regardless of compositional nesting (RESEARCH §3.2 step 4 + Assumption A5).

**Verification trigger (Wave 3, Tier 1 rows 1-2 + 4):** during auth-screen device test, watch for:
- Eye icon misalignment when keyboard is open (would indicate `position: 'absolute'` interaction with KASV's animated container).
- Eye-icon tap not toggling visibility when input is focused (would indicate KASV's gesture handler eating the tap).

If either fails: confirm `keyboardShouldPersistTaps="handled"` is set on the wrapping KASV (already specified in RESEARCH §3.2 step 2). Do NOT modify PasswordTextInput itself unless strictly necessary — that's Phase scope expansion.

---

## Shared Patterns

### Pattern 1 — KASV import + props (auth + AccountSettings + CreateListing)

**Source:** RESEARCH §3.2 (codifies library docs).
**Apply to:** all 7 KASV-wrapping sites (4 auth + AccountSettings + 2 CreateListing branches).

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

// Standard prop set used across all 7 sites:
<KeyboardAwareScrollView
  contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}  // auth screens
  // OR for screens that already had a styles.scrollContent — pass it through:
  contentContainerStyle={styles.scrollContent}                        // CreateListing, AccountSettings
  keyboardShouldPersistTaps="handled"
  bottomOffset={20}
  showsVerticalScrollIndicator={false}                                // where original ScrollView had it
>
```

**Pattern note:** `bottomOffset={20}` is the library's idiomatic spacing — explicitly NOT a `keyboardVerticalOffset` magic number. It's a static 20pt gap below the focused input, library-recommended (RESEARCH §3.2). The §6 SC3.a grep gate (`grep -rn "keyboardVerticalOffset" src/` → 0) does not flag `bottomOffset`.

### Pattern 2 — KAV import + props (chat screens)

**Source:** RESEARCH §3.5.
**Apply to:** `ChatThreadScreen.tsx` + `ChatComposeScreen.tsx`.

```tsx
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

<KeyboardAvoidingView style={styles.keyboardView}>
  {/* composer body — unchanged */}
</KeyboardAvoidingView>
```

**Removed props:** `behavior`, `keyboardVerticalOffset`. Library defaults handle both via `KeyboardProvider` frame events.

### Pattern 3 — Provider tree slot (App.tsx)

**Source:** CONTEXT D-03 + CLAUDE.md "Key Conventions".
**Apply to:** `App.tsx` only.

```tsx
<SafeAreaProvider>
  <KeyboardProvider>          {/* ← NEW; ONLY at this exact slot */}
    <ThemeProvider>            {/* ← order locked from here down */}
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </KeyboardProvider>
</SafeAreaProvider>
```

### Pattern 4 — Theme + i18n untouched (no copy changes in Phase 2)

**Source:** CONTEXT `<code_context>` "Established Patterns".

**Recurring theme pattern** (used in every screen modified):

```tsx
const { colors, isDark } = useTheme();
// ... colors.background, colors.text, colors.inputBackground, colors.border, colors.primary, colors.accent ...
```

**Recurring i18n pattern** (used in every screen modified):

```tsx
const { t } = useLanguage();
// ... t('auth.email'), t('createListing.cancel'), t('verification.adminSectionTitle'), etc. ...
```

**Pattern callout:** Phase 2 adds NO new strings to `src/locales/en.json` or `src/locales/ru.json`. `useTheme()` is also untouched — KASV's background inherits from the wrapping `<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>`. EN+RU parity (CLAUDE.md convention) and dark/light parity are not at risk; the verifier should NOT need to look at locale files for this phase.

### Pattern 5 — Babel plugin order (load-bearing comment)

**Source:** RESEARCH §2.3 + L2.
**Apply to:** `babel.config.js`.

```js
plugins: [
  // any future plugin goes ABOVE this line
  'react-native-worklets/plugin', // MUST be last; reanimated v4 ships its plugin here
],
```

The trailing comment IS the pattern — preserve it verbatim so future contributors don't append below it.

---

## No Analog Found

None. Phase 2 is exclusively in-place edits to existing files; every modified file is its own analog (current state captured above as the BEFORE-diff). No new file is created or scaffolded by Phase 2.

---

## Risk-Reducing Pattern Callouts (executor reference)

| # | Risk | Pattern that mitigates |
|---|------|-----------------------|
| 1 | `KeyboardProvider` placed in wrong slot → silent no-op of all library components | Provider Tree Slot (Pattern 3) — exact 4-line region between `SafeAreaProvider` and `ThemeProvider` |
| 2 | Babel plugin not last → silent runtime failure with no compile error | Babel Plugin Order (Pattern 5) — trailing `// MUST be last` comment is documentation-as-load-bearing |
| 3 | `Podfile` hand-edited by mistake → conflict with `use_native_modules!` autolink | Podfile section above — explicitly DO NOT EDIT; `pod install` is the only allowed action |
| 4 | `keyboardVerticalOffset` re-introduced to "fix" a visual issue | Pattern 2 + KBD-02 + §6 SC3.a grep gate — fix via `paddingBottom` on `inputRow`, never via offset prop |
| 5 | Removing `Platform` from chat-screen imports breaks unrelated `Platform.OS` usage | Chat Screen Pattern callout — `grep -n "Platform\." <file>` BEFORE removing the import |
| 6 | `ScrollView` left in `react-native` import after KASV swap (lint warning) | `AccountSettingsScreen.tsx` + `CreateListingScreen.tsx` callouts — confirm 0 remaining `ScrollView` usages before removing import |
| 7 | `PasswordTextInput` modified during auth-screen pass (scope creep) | PasswordTextInput section — verify-only; no edit; eye-icon issues fixed via `keyboardShouldPersistTaps="handled"` on the WRAPPING KASV |
| 8 | Auth screen visual layout breaks (centering lost) when keyboard is closed | KASV Import + Props (Pattern 1) — `contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}` preserves the existing `justifyContent: 'center'` look |
| 9 | Multiline TextInput refuses to grow under KASV/Fabric (L10) | ResetPasswordScreen + ChatThreadScreen + ChatComposeScreen sections flag `multiline` props — verify in Wave 3 Tier 1 rows 4, 7, 8 |
| 10 | HomeScreen workaround removal breaks search-bar focus | HomeScreen section — cleanup is OPTIONAL; comment-only; revert if smoke-test fails |

---

## Metadata

**Analog search scope:**
- `App.tsx` (root)
- `babel.config.js`, `package.json`, `ios/Podfile` (config)
- `src/screens/{LoginScreen,SignupScreen,ForgotPasswordScreen,ResetPasswordScreen,CreateListingScreen,AccountSettingsScreen,ChatThreadScreen,ChatComposeScreen,HomeScreen}.tsx`
- `src/components/PasswordTextInput.tsx`

**Files scanned:** 14 (10 screen files + 1 component + 3 config files)

**Pattern extraction date:** 2026-04-22

**No project skills directory found** (`.claude/skills/` and `.agents/skills/` absent — confirmed). Pattern conventions sourced from `CLAUDE.md` "Key Conventions" + `.planning/codebase/CONVENTIONS.md` per Phase 1 precedent.

---

## PATTERN MAPPING COMPLETE
