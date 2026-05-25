---
id: 260525-fjw
type: quick
status: ready
created: 2026-05-25
description: "Fix iOS keyboard covering the chat input on ChatThreadScreen and ChatComposeScreen by hoisting the screen-level <KeyboardAvoidingView> outside the header (project-canonical fix shape; preserves the KBD-02 / Phase 2 §6 SC3.a `keyboardVerticalOffset` grep gate)."

files_modified:
  - src/screens/ChatThreadScreen.tsx
  - src/screens/ChatComposeScreen.tsx

must_haves:
  truths:
    - "On iOS, when the user opens an existing chat thread (ChatThreadScreen) and taps the composer TextInput, the input remains visible above the system keyboard."
    - "On iOS, when the user taps the message button on a property detail and lands on ChatComposeScreen, the composer TextInput remains visible above the system keyboard when focused."
    - "On Android, the same two surfaces continue to render the composer above the keyboard with no regression vs. the M1 Phase 2 baseline (Tier 1 rows 7 + 8, iOS+Android PASS recorded 2026-04-23 in `02-06-SUMMARY.md`)."
    - "The chat header (back button + title + report/calendar buttons) remains visible and tappable while the keyboard is open — it is not pushed off-screen by the keyboard's avoidance behavior."
    - "The FlatList of existing messages on ChatThreadScreen still auto-scrolls to the latest message when the keyboard opens and when a new message arrives."
    - "The Phase 2 KBD-02 / §6 SC3.a phase-wide grep gate `grep -rn 'keyboardVerticalOffset' src/ | wc -l` continues to return 0 (no per-screen magic-number offset re-introduced)."
    - "The Phase 2 chat-canonical `behavior=\"padding\"` prop on the library KAV is preserved (load-bearing per M1 commit `47a52b7` and Key Decisions row 208 — library KAV no-ops without an explicit `behavior` prop, disproving RESEARCH §9 A8)."
  artifacts:
    - path: "src/screens/ChatThreadScreen.tsx"
      provides: "Chat thread screen with composer that stays above iOS keyboard."
      contains: "<KeyboardAvoidingView behavior=\"padding\""
    - path: "src/screens/ChatComposeScreen.tsx"
      provides: "New-chat compose screen with composer that stays above iOS keyboard."
      contains: "<KeyboardAvoidingView behavior=\"padding\""
  key_links:
    - from: "src/screens/ChatThreadScreen.tsx (SafeAreaView edges=['top'])"
      to: "<KeyboardAvoidingView behavior=\"padding\" style={{ flex: 1 }}>"
      via: "Direct child of SafeAreaView (header + loading + FlatList + inputRow ALL inside KAV)"
      pattern: "<KeyboardAvoidingView behavior=\"padding\""
    - from: "src/screens/ChatComposeScreen.tsx (SafeAreaView edges=['top'])"
      to: "<KeyboardAvoidingView behavior=\"padding\" style={{ flex: 1 }}>"
      via: "Direct child of SafeAreaView (header + previewCard + inputRow ALL inside KAV)"
      pattern: "<KeyboardAvoidingView behavior=\"padding\""
---

<objective>
Fix the iOS regression where the system keyboard covers the composer `TextInput` on the two built-in chat surfaces: `src/screens/ChatThreadScreen.tsx` (line 203 KAV) and `src/screens/ChatComposeScreen.tsx` (line 115 KAV).

Root cause (verified by reading both files + the M1 Phase 2 canonical pattern doc at `.planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-PATTERNS.md`): on both screens, the custom `renderHeader()` is rendered as a **sibling above** the `<KeyboardAvoidingView>`, **outside** the KAV's coordinate system. The library KAV (`react-native-keyboard-controller`'s drop-in) computes `padding` from the keyboard top to its own bottom — but since the header sits above the KAV, the KAV's frame starts ~52pt + safe-area top BELOW the screen origin, so the keyboard-avoidance math under-compensates and the composer rides under the keyboard. M1 Phase 2 row 7 + row 8 originally passed at 2026-04-23 (`02-06-SUMMARY.md`) and the bug only surfaces today — the regression vector is not the props (`behavior="padding"` is still correct per M1 hotfix commit `47a52b7`); it's the **structural placement** of the header relative to the KAV.

Project-canonical fix shape: **hoist the KAV outward** so it wraps the entire screen body INCLUDING the header. The KBD-02 / Phase 2 §6 SC3.a invariant (`grep -rn "keyboardVerticalOffset" src/ → 0`) is preserved — no magic-number offset prop is introduced. The load-bearing `behavior="padding"` prop stays put. The header sits inside the KAV's coordinate system so frame-event math compensates correctly. On Android the existing behavior is preserved (Android relies on `windowSoftInputMode="adjustResize"` set in M1 Phase 2; library KAV `behavior="padding"` is iOS-effective, near-inert on Android — Phase 2 row 7/8 Android passed with the same structure on form screens).

Purpose: close a reproducible iOS UI blocker that violates `.planning/PROJECT.md`'s explicit core-value guard ("without UI blockers (keyboard covering inputs, ...)") on a high-traffic conversion surface (chat is how renters/buyers contact landlords).

Output: 2 atomic commits, one per chat screen file, identical structural transform. No new dependencies, no new i18n strings, no theme-token changes, no `App.tsx` provider changes, no changes to any other screen.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@./CLAUDE.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/ARCHITECTURE.md
@src/screens/ChatThreadScreen.tsx
@src/screens/ChatComposeScreen.tsx
@.planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-05-SUMMARY.md
@.planning/milestones/v1.0.4-phases/02-universal-keyboard-handling/02-06-SUMMARY.md

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from the M1 Phase 2 canonical pattern + the current chat-screen source. Executor uses these directly — no codebase exploration needed. -->

Project keyboard library (already installed; do NOT add/remove deps):
  package.json: "react-native-keyboard-controller": "^1.21.6"
  package.json: "react-native-reanimated": "^4.3.0"
  package.json: "react-native-worklets": "^0.8.1"

Root provider (already mounted at App.tsx:1372 — DO NOT TOUCH):
  import { KeyboardProvider } from 'react-native-keyboard-controller';
  Mounted between SafeAreaProvider and ThemeProvider.

Library KAV import (already correct on both chat files):
  import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
  // NOT the RN built-in import.

Canonical chat-screen KAV prop set (from M1 commit `47a52b7` + Key Decisions row 208):
  <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
  // `behavior="padding"` is LOAD-BEARING — library KAV no-ops without it (M1 disproven assumption A8).
  // `keyboardVerticalOffset` is BANNED — `grep -rn "keyboardVerticalOffset" src/ → 0` is a phase-exit gate.

Existing structural shape (BEFORE — both files share this anti-pattern):
  <SafeAreaView edges={['top']}>
    {renderHeader()}                          ← header rendered OUTSIDE KAV
    {loading ? <Spinner/> : (                 ← (ChatThreadScreen only)
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
        <FlatList .../>                       ← (ChatThreadScreen)
        <View previewCard />                  ← (ChatComposeScreen)
        <View inputRow><TextInput/><Send/></View>
      </KeyboardAvoidingView>
    )}
  </SafeAreaView>

Target structural shape (AFTER — hoist KAV outward):
  <SafeAreaView edges={['top']}>
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      {renderHeader()}                        ← header now INSIDE KAV coordinate system
      {loading ? <Spinner/> : (               ← (ChatThreadScreen only — inner conditional preserved)
        <>
          <FlatList .../>                     ← (ChatThreadScreen)
          <View previewCard />                ← (ChatComposeScreen — previewCard stays above input)
          <View inputRow><TextInput/><Send/></View>
        </>
      )}
    </KeyboardAvoidingView>
  </SafeAreaView>

ChatThreadScreen specifics (verbatim, from the current source you'll edit):
  - File: src/screens/ChatThreadScreen.tsx
  - Current KAV opening: line 203 — `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>`
  - Current KAV closing: line 235 — `</KeyboardAvoidingView>`
  - Header function: `renderHeader()` defined at line 146; invoked at line 197
  - Loading conditional: lines 198–201 (ActivityIndicator spinner)
  - SafeAreaView wrapper: line 196 with `edges={['top']}`
  - Outer container style: `styles.container = { flex: 1 }` (line 242)
  - KAV inner style alias: `styles.keyboardView = { flex: 1 }` (line 258) — this style can stay as-is on the hoisted KAV; it's compatible with full-screen wrap.
  - The FlatList `onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}` (line 210) MUST be preserved verbatim; it's the auto-scroll-to-latest behavior asserted in must_haves.truths.

ChatComposeScreen specifics (verbatim, from the current source you'll edit):
  - File: src/screens/ChatComposeScreen.tsx
  - Current KAV opening: line 115 — `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>`
  - Current KAV closing: line 139 — `</KeyboardAvoidingView>`
  - Header function: `renderHeader()` defined at line 69; invoked at line 94
  - SafeAreaView wrapper: line 93 with `edges={['top']}`
  - Outer container style: `styles.container = { flex: 1 }` (line 146)
  - The `composeContent` wrapper `<View style={styles.composeContent}>` at line 95 currently wraps the previewCard + KAV pair (with `composeContent = { flex: 1 }` at line 160). When hoisting the KAV outward, this intermediate wrapper becomes redundant — DELETE it (the previewCard + inputRow become direct children of the hoisted KAV).
  - The `keyboardView` style currently sets `{ flex: 1, justifyContent: 'flex-end' }` (line 182). When hoisted, the `justifyContent: 'flex-end'` is what pins the inputRow to the bottom — this MUST be preserved so the previewCard stays at top and inputRow stays at bottom. The hoisted KAV keeps `style={styles.keyboardView}` verbatim.

Theme + i18n (CLAUDE.md conventions — neither changes in this fix):
  - useTheme() colors: colors.background, colors.text, colors.surface, colors.border, colors.accent, colors.textSecondary, colors.inputBackground — all preserved verbatim from existing source
  - useLanguage() keys used: 'chat.typeMessageThread', 'chat.typeMessage' (composer placeholders); 'chat.title', 'chat.user', 'chat.listing', 'chat.listingOwner', 'chat.messageAbout' (header/preview); 'chat.report*' (report flow); 'common.back', 'common.error', 'common.cancel', 'common.thankYou' — ALL PRESERVED VERBATIM, no new keys
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Hoist KeyboardAvoidingView outward on ChatThreadScreen so the header sits inside its coordinate system</name>
  <files>src/screens/ChatThreadScreen.tsx</files>
  <action>
Edit only the JSX returned by the `ChatThreadScreen` functional component (currently lines 195–238). Restructure the return statement so the `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` is a DIRECT CHILD of `<SafeAreaView>`, wrapping the header + the loading/content conditional. Do NOT touch any other part of the file — preserve all imports, all hooks, all callbacks (`loadMessages`, `useEffect` socket setup + cleanup, `handleSend`, `handleReport`, `submitReport`, `renderHeader`, `renderMessage`, `isOwnMessage`), all `REPORT_REASONS`, the entire StyleSheet, every i18n key, every theme token, every type import.

Verbatim BEFORE (lines 195–238 — for diff reference):

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
          <FlatList ... />
          <View style={[styles.inputRow, ...]}>
            <TextInput .../>
            <TouchableOpacity .../>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );

Verbatim AFTER (target):

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
        {renderHeader()}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <>
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
                placeholder={t('chat.typeMessageThread')}
                placeholderTextColor={colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                multiline
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
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

Key invariants for this transform:
- The `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` opening tag is now a direct child of `<SafeAreaView>`. There is exactly ONE KAV in the file, opened once, closed once. `behavior="padding"` MUST remain present (load-bearing per M1 commit `47a52b7`).
- `renderHeader()` is now INSIDE the KAV — this is the entire fix.
- The `loading ? Spinner : (FlatList + inputRow)` conditional structure is preserved exactly; the only change is that its two branches both become children of the hoisted KAV instead of children of the SafeAreaView.
- The previously-implicit React fragment for the non-loading branch (which was the `<KeyboardAvoidingView>` itself acting as the single parent) becomes an explicit `<>...</>` fragment to keep FlatList and inputRow as sibling JSX nodes returned from the conditional.
- The `styles.keyboardView = { flex: 1 }` definition stays as-is (compatible with full-screen wrap; no style edit needed).
- DO NOT introduce `keyboardVerticalOffset` (project-banned per KBD-02 / §6 SC3.a grep gate).
- DO NOT change the SafeAreaView `edges={['top']}` — bottom safe-area is intentionally left to the inputRow's own padding.
- DO NOT add `Platform.OS === 'ios'` guards or any platform conditional. The library KAV with `behavior="padding"` is iOS-effective and Android-inert; the M1 Phase 2 row 7 PASS on Android (Moto G XT2513V) confirms this shape is cross-platform safe.
- DO NOT touch any line above 195 or below 238 in the original file. Imports, types, hooks, callbacks, REPORT_REASONS, StyleSheet — all unchanged.

After the edit, commit atomically:
  git add src/screens/ChatThreadScreen.tsx
  git commit -m "fix(quick-260525-fjw): hoist KAV outward on ChatThreadScreen so header sits inside its coordinate system" -m "" -m "iOS keyboard was covering the composer because renderHeader() was rendered as a sibling above the library KeyboardAvoidingView — outside its coordinate system. KAV with behavior='padding' computed offset from keyboard top to its own bottom; since header consumed ~52pt + safe-area top above the KAV, the avoidance math under-compensated and the composer rode under the keyboard." -m "" -m "Fix: KAV is now a direct child of SafeAreaView, wrapping renderHeader() + loading conditional + FlatList + inputRow. Header floats up out of the way naturally. behavior='padding' preserved (load-bearing per M1 commit 47a52b7). keyboardVerticalOffset NOT introduced — Phase 2 §6 SC3.a grep gate (KBD-02) preserved." -m "" -m "M1 Phase 2 references: 02-PATTERNS.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md."
  </action>
  <verify>
    <automated>
# All gates must pass. Run from project root.
set -e
cd /Users/beckmaldinVL/development/mobileApps/JayTap

# Gate 1: exactly one KAV opening tag in the file
test "$(grep -c '&lt;KeyboardAvoidingView' src/screens/ChatThreadScreen.tsx)" = "1"

# Gate 2: exactly one KAV closing tag in the file
test "$(grep -c '&lt;/KeyboardAvoidingView&gt;' src/screens/ChatThreadScreen.tsx)" = "1"

# Gate 3: KAV still carries behavior="padding" (load-bearing per M1 47a52b7)
test "$(grep -c 'behavior=\"padding\"' src/screens/ChatThreadScreen.tsx)" = "1"

# Gate 4: KAV import source is the library, not RN built-in
test "$(grep -c \"import { KeyboardAvoidingView } from 'react-native-keyboard-controller'\" src/screens/ChatThreadScreen.tsx)" = "1"

# Gate 5: KBD-02 / Phase 2 §6 SC3.a — file-local invariant (excluding comments)
test "$(grep -v '^[[:space:]]*//' src/screens/ChatThreadScreen.tsx | grep -c 'keyboardVerticalOffset')" = "0"

# Gate 6: KBD-02 / Phase 2 §6 SC3.a — phase-wide invariant (still holds across all of src/)
test "$(grep -rn 'keyboardVerticalOffset' src/ | wc -l | tr -d ' ')" = "0"

# Gate 7: KAV is now a direct child of SafeAreaView (header is inside KAV, not before it)
#   AFTER:  SafeAreaView ... > then KAV opens; renderHeader() invoked AFTER KAV opens, not before
#   The textual order in the file is: line with "SafeAreaView", then KAV opening, then "{renderHeader()}".
awk '
  /&lt;SafeAreaView/ { saw_safe=NR }
  /&lt;KeyboardAvoidingView/ { saw_kav=NR }
  /renderHeader\(\)/ { saw_header=NR }
  END {
    if (saw_safe &lt; saw_kav &amp;&amp; saw_kav &lt; saw_header) { exit 0 } else { exit 1 }
  }
' src/screens/ChatThreadScreen.tsx

# Gate 8: FlatList + auto-scroll preserved verbatim
test "$(grep -c \"flatListRef.current?.scrollToEnd({ animated: true })\" src/screens/ChatThreadScreen.tsx)" = "1"

# Gate 9: No new i18n keys added (this fix is structural only)
git diff HEAD~1 HEAD -- src/locales/en.json src/locales/ru.json | wc -l | tr -d ' ' | grep -qE '^0$'

# Gate 10: TypeScript compiles with no NEW errors vs. pre-fix baseline
#   (project carries pre-existing TS errors per M1 deferred-items.md; we only assert no NEW errors).
NEW_ERRS=$(npx tsc --noEmit 2>&amp;1 | grep -c "ChatThreadScreen.tsx")
test "$NEW_ERRS" = "0"

echo "ChatThreadScreen all gates PASS"
    </automated>
  </verify>
  <done>
- `src/screens/ChatThreadScreen.tsx` returns a JSX tree where `<SafeAreaView edges={['top']}>` directly contains exactly one `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>`, and that KAV in turn contains `{renderHeader()}` followed by the `loading ? Spinner : <>FlatList + inputRow</>` conditional.
- All 10 automated gates above return exit code 0.
- Atomic commit landed with the message from the action block, touching ONLY `src/screens/ChatThreadScreen.tsx` (1 file).
- No `keyboardVerticalOffset` anywhere in `src/` (project-wide grep returns 0).
- No new i18n strings, no theme-token changes, no other file modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Hoist KeyboardAvoidingView outward on ChatComposeScreen so the header sits inside its coordinate system</name>
  <files>src/screens/ChatComposeScreen.tsx</files>
  <action>
Edit only the JSX returned by the `ChatComposeScreen` functional component (currently lines 92–142). Restructure the return statement so the `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` is a DIRECT CHILD of `<SafeAreaView>`, wrapping the header + the property previewCard + the inputRow. Delete the now-redundant intermediate `<View style={styles.composeContent}>` wrapper. Do NOT touch any other part of the file — preserve all imports, the `owner` / `ownerName` / `imageUrl` derivations, the `handleSend` callback, the `renderHeader` function, every i18n key, every theme token, every type import.

Verbatim BEFORE (lines 92–142 — for diff reference):

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      <View style={styles.composeContent}>
        <View style={[styles.previewCard, ...]}>
          <View style={[styles.avatar, ...]}>
            {imageUrl ? <Image .../> : <Text>{property.title?.charAt(0) || '?'}</Text>}
          </View>
          <View style={styles.previewText}>
            <Text numberOfLines={1}>{property.title}</Text>
            <Text>{t('chat.messageAbout', { name: ownerName })}</Text>
          </View>
        </View>
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
          <View style={[styles.inputRow, ...]}>
            <TextInput .../>
            <TouchableOpacity .../>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );

Verbatim AFTER (target):

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
        {renderHeader()}
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                {property.title?.charAt(0) || '?'}
              </Text>
            )}
          </View>
          <View style={styles.previewText}>
            <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
              {property.title}
            </Text>
            <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
              {t('chat.messageAbout', { name: ownerName })}
            </Text>
          </View>
        </View>
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground }]}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
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
    </SafeAreaView>
  );

Key invariants for this transform:
- The `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>` opening tag is now a direct child of `<SafeAreaView>`. There is exactly ONE KAV in the file, opened once, closed once. `behavior="padding"` MUST remain present.
- The intermediate `<View style={styles.composeContent}>` wrapper is DELETED — the hoisted KAV with `styles.keyboardView = { flex: 1, justifyContent: 'flex-end' }` (line 182) takes over its role. The `justifyContent: 'flex-end'` on `keyboardView` is what pins the inputRow to the bottom of the screen; it MUST be preserved verbatim. The previewCard floats at the top (above flex-end content), the inputRow sits at the bottom, header sits at the top above the previewCard.
- The `styles.composeContent` entry in the StyleSheet (line 160 `composeContent: { flex: 1 }`) becomes unused after this edit — it is safe to leave in the StyleSheet (harmless) OR remove it to keep the diff tight. Recommendation: leave `styles.composeContent` in the StyleSheet (zero functional cost; one less line of diff to review).
- `renderHeader()` is now INSIDE the KAV — this is the core fix.
- DO NOT introduce `keyboardVerticalOffset` (project-banned per KBD-02 / §6 SC3.a grep gate).
- DO NOT change the SafeAreaView `edges={['top']}`.
- DO NOT add `Platform.OS === 'ios'` guards or any platform conditional.
- DO NOT touch any line above 92 or below 142 (other than the noted optional StyleSheet cleanup, if pursued). Imports, hooks, callbacks, `owner`/`ownerName`/`imageUrl` derivations, StyleSheet entries other than `composeContent` — all unchanged.

After the edit, commit atomically:
  git add src/screens/ChatComposeScreen.tsx
  git commit -m "fix(quick-260525-fjw): hoist KAV outward on ChatComposeScreen so header sits inside its coordinate system" -m "" -m "iOS keyboard was covering the composer because renderHeader() was rendered as a sibling above the library KeyboardAvoidingView — outside its coordinate system. KAV with behavior='padding' computed offset from keyboard top to its own bottom; since header + propertyPreview card consumed real estate above the KAV, the avoidance math under-compensated and the composer rode under the keyboard." -m "" -m "Fix: KAV is now a direct child of SafeAreaView, wrapping renderHeader() + previewCard + inputRow. Intermediate composeContent View deleted (KAV with keyboardView style { flex:1, justifyContent:'flex-end' } takes over). behavior='padding' preserved (M1 commit 47a52b7). keyboardVerticalOffset NOT introduced — Phase 2 §6 SC3.a grep gate (KBD-02) preserved." -m "" -m "Twin fix to the ChatThreadScreen change in the previous commit (260525-fjw)."
  </action>
  <verify>
    <automated>
# All gates must pass. Run from project root.
set -e
cd /Users/beckmaldinVL/development/mobileApps/JayTap

# Gate 1: exactly one KAV opening tag in the file
test "$(grep -c '&lt;KeyboardAvoidingView' src/screens/ChatComposeScreen.tsx)" = "1"

# Gate 2: exactly one KAV closing tag in the file
test "$(grep -c '&lt;/KeyboardAvoidingView&gt;' src/screens/ChatComposeScreen.tsx)" = "1"

# Gate 3: KAV still carries behavior="padding"
test "$(grep -c 'behavior=\"padding\"' src/screens/ChatComposeScreen.tsx)" = "1"

# Gate 4: KAV import source is the library, not RN built-in
test "$(grep -c \"import { KeyboardAvoidingView } from 'react-native-keyboard-controller'\" src/screens/ChatComposeScreen.tsx)" = "1"

# Gate 5: KBD-02 / Phase 2 §6 SC3.a — file-local invariant (excluding comments)
test "$(grep -v '^[[:space:]]*//' src/screens/ChatComposeScreen.tsx | grep -c 'keyboardVerticalOffset')" = "0"

# Gate 6: KBD-02 / Phase 2 §6 SC3.a — phase-wide invariant (still holds across all of src/)
test "$(grep -rn 'keyboardVerticalOffset' src/ | wc -l | tr -d ' ')" = "0"

# Gate 7: SafeAreaView → KAV → renderHeader ordering (header now inside KAV)
awk '
  /&lt;SafeAreaView/ { saw_safe=NR }
  /&lt;KeyboardAvoidingView/ { saw_kav=NR }
  /renderHeader\(\)/ &amp;&amp; !seen_invoke { saw_header=NR; seen_invoke=1 }
  END {
    # Note: renderHeader() also appears as a function definition earlier in the file.
    # Filter to the invocation by tracking the first occurrence AFTER SafeAreaView opens.
    if (saw_safe &lt; saw_kav &amp;&amp; saw_kav &lt; saw_header) { exit 0 } else { exit 1 }
  }
' <(awk 'BEGIN{after=0} /return \(/{after=1} after{print}' src/screens/ChatComposeScreen.tsx)

# Gate 8: composeContent intermediate View removed from JSX (only the unused StyleSheet entry may remain)
#   In the JSX return block (after "return ("), there should be zero `style={styles.composeContent}` usages.
awk 'BEGIN{after=0} /return \(/{after=1} after &amp;&amp; /style=\{styles\.composeContent\}/{found=1} END{exit found?1:0}' src/screens/ChatComposeScreen.tsx

# Gate 9: keyboardView style preserves the load-bearing flex+justifyContent
grep -q "keyboardView: { flex: 1, justifyContent: 'flex-end' }" src/screens/ChatComposeScreen.tsx

# Gate 10: No new i18n keys added
git diff HEAD~1 HEAD -- src/locales/en.json src/locales/ru.json | wc -l | tr -d ' ' | grep -qE '^0$'

# Gate 11: TypeScript no new errors on this file
NEW_ERRS=$(npx tsc --noEmit 2>&amp;1 | grep -c "ChatComposeScreen.tsx")
test "$NEW_ERRS" = "0"

echo "ChatComposeScreen all gates PASS"
    </automated>
  </verify>
  <done>
- `src/screens/ChatComposeScreen.tsx` returns a JSX tree where `<SafeAreaView edges={['top']}>` directly contains exactly one `<KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>`, and that KAV in turn contains `{renderHeader()}` followed by the `<View previewCard>...` and the `<View inputRow>...` blocks as direct siblings.
- The intermediate `<View style={styles.composeContent}>` wrapper is removed from the JSX (the StyleSheet entry `composeContent: { flex: 1 }` may remain — it is harmless dead-code at minimum cost; removing it is optional and out of scope of the gates).
- All 11 automated gates above return exit code 0.
- Atomic commit landed with the message from the action block, touching ONLY `src/screens/ChatComposeScreen.tsx` (1 file).
- No `keyboardVerticalOffset` anywhere in `src/` (project-wide grep returns 0).
- No new i18n strings, no theme-token changes, no other file modified.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: On-device QA — confirm fix on iPhone + (if available) Android Moto G</name>
  <what-built>
Two atomic commits that restructure the JSX of the two built-in chat surfaces so the screen-level `<KeyboardAvoidingView>` (`react-native-keyboard-controller`) wraps the chat header instead of being mounted below it. The KAV's `behavior="padding"` prop (load-bearing per M1 commit `47a52b7`) and the project-wide `keyboardVerticalOffset` ban (KBD-02 / §6 SC3.a) are both preserved. No new dependencies, no i18n changes, no theme changes, no other screens touched.
  </what-built>
  <how-to-verify>
**iOS (BLOCKING — this is the reported bug surface; iPhone 15 Pro Max baseline per M3 close):**

1. `cd /Users/beckmaldinVL/development/mobileApps/JayTap && npx react-native run-ios` (or open in Xcode and run on a physical iPhone).
2. Sign in. Open a property → tap the chat / message button → land on **ChatComposeScreen**.
   - Tap the composer `TextInput`.
   - **Expected:** keyboard rises; the composer `TextInput` (placeholder "Type your message...") remains visible above the keyboard. The property preview card stays visible above the composer. The chat header (back button + property title + calendar icon) remains visible at the top of the screen and is tappable.
   - **Regression check:** type at least one full line of text — the multiline composer should grow up to `maxLength={2000}`, all of it visible. Tap Send. Conversation thread opens.
3. Now in **ChatThreadScreen** (from step 2 or by opening any existing conversation from the chat inbox):
   - Tap the composer `TextInput` (placeholder "Type a message...").
   - **Expected:** keyboard rises; the composer is visible above the keyboard; the most-recent message in the FlatList above is visible above the composer; the chat header (back / property title / report flag / calendar) is visible at the top.
   - **Regression check:** send a message — the new message bubble auto-scrolls into view (`flatListRef.current?.scrollToEnd`).
   - **Regression check:** tap the back button while the keyboard is open — first tap dismisses the keyboard OR pops back to chat list (either is acceptable per M1 Phase 2 row 7 back-button behavior). Header remained tappable throughout.
4. **Dark + light parity** (CLAUDE.md requirement): repeat step 2 + step 3 in BOTH dark mode and light mode. Theme tokens already drive all colors; no regression expected.

**Android (RECOMMENDED — user said "not tested yet"; baseline is Moto G XT2513V per M3 close):**

5. `npx react-native run-android` on a physical Android device (or emulator if no device available).
6. Repeat steps 2 + 3 + 4 on Android.
   - **Expected:** identical visual outcome to iOS. Library `KeyboardAvoidingView` with `behavior="padding"` is iOS-effective but near-inert on Android (Android handles soft-input via `windowSoftInputMode="adjustResize"`, already set in M1 Phase 2). No regression vs. the M1 Phase 2 baseline (`02-06-SUMMARY.md` Tier 1 rows 7 + 8 Android PASS recorded 2026-04-23).
   - **Android hardware back button** check: with keyboard open, tap the hardware back button — keyboard should dismiss (system default); a second back press should pop back to chat list (per `App.tsx` Phase 1 BackHandler `useEffect`). No conflict with the KAV restructure.

**If the user has no Android device on hand for this session** (per the user's verbatim bug report: "I'm not sure about Android. I haven't tested yet"): iOS verification alone is sufficient to ship this fix. Android verification can be deferred to opportunistic check on next available device session (non-blocking) since the structural transform is cross-platform safe by the M1 Phase 2 precedent.

**If the user observes a 1–2 px gap between composer and keyboard on iOS** (the same fine-tuning escape-hatch M1 Phase 2 documented at Plan 02-05 "Deferred / Out of scope"): the project-canonical adjustment is to add `paddingBottom` to `styles.inputRow` in the affected file — NOT to re-introduce `keyboardVerticalOffset` (which would break the §6 SC3.a grep gate). This is unlikely with the structural fix; flag only if it appears.
  </how-to-verify>
  <resume-signal>Type "approved" if both chat surfaces show the composer above the iOS keyboard (and Android if tested) with no header / FlatList / send-button regression. Type a description of any issue otherwise.</resume-signal>
</task>

</tasks>

<verification>
**Combined exit gates (run after Task 1 + Task 2 both committed; Task 3 is the device walk).**

```bash
cd /Users/beckmaldinVL/development/mobileApps/JayTap

# Phase 2 KBD-02 / §6 SC3.a invariant — project-wide
grep -rn 'keyboardVerticalOffset' src/ | wc -l   # must be 0

# Both chat screens have exactly one KAV with behavior="padding" from the library
grep -c '<KeyboardAvoidingView behavior="padding"' src/screens/ChatThreadScreen.tsx   # must be 1
grep -c '<KeyboardAvoidingView behavior="padding"' src/screens/ChatComposeScreen.tsx  # must be 1

# Both files still import KAV from the library, not the RN built-in
grep -c "from 'react-native-keyboard-controller'" src/screens/ChatThreadScreen.tsx    # must be 1
grep -c "from 'react-native-keyboard-controller'" src/screens/ChatComposeScreen.tsx   # must be 1

# Atomic commit hygiene: exactly 2 commits, one file each
test "$(git log --oneline HEAD~2..HEAD | wc -l | tr -d ' ')" = "2"
test "$(git show --name-only HEAD~1 | grep -v '^$\|^commit\|^Author\|^Date\|^ ' | wc -l | tr -d ' ')" = "1"
test "$(git show --name-only HEAD   | grep -v '^$\|^commit\|^Author\|^Date\|^ ' | wc -l | tr -d ' ')" = "1"

# Zero i18n diff across both commits
test -z "$(git diff HEAD~2 HEAD -- src/locales/en.json src/locales/ru.json)"

# Zero new TS errors on either chat file
npx tsc --noEmit 2>&1 | grep -E "ChatThreadScreen.tsx|ChatComposeScreen.tsx" | wc -l | tr -d ' '   # must be 0

# Other chat-related screens NOT touched
git diff HEAD~2 HEAD --name-only | sort -u
# Expected exactly:
#   src/screens/ChatComposeScreen.tsx
#   src/screens/ChatThreadScreen.tsx
```

**Phase 2 inheritance check (the universal-keyboard-handling phase contract must remain intact across all sites M1 already shipped):**

```bash
# 4 auth screens still wrap with KASV
for f in LoginScreen SignupScreen ForgotPasswordScreen ResetPasswordScreen; do
  grep -c "KeyboardAwareScrollView" src/screens/$f.tsx
done
# Each must be ≥ 2 (import + JSX element)

# Settings + CreateListing + LandlordApplication + MediaCuration + AdminVerification still on KASV
for f in AccountSettingsScreen CreateListingScreen LandlordApplicationScreen MediaCurationScreen AdminVerificationScreen; do
  grep -c "from 'react-native-keyboard-controller'" src/screens/$f.tsx
done
# Each must be ≥ 1

# KeyboardProvider still mounted at App.tsx root
grep -c "KeyboardProvider" App.tsx   # must be ≥ 2
```

**Device walk (Task 3 — blocking checkpoint; iOS-only acceptable per user's "Android not tested yet"):** Composer visible above keyboard on both chat screens, dark + light parity confirmed, no regression to FlatList auto-scroll / Send button / back navigation / report flow.
</verification>

<success_criteria>
- iOS user can open `ChatThreadScreen` or `ChatComposeScreen`, tap the composer `TextInput`, and see the input fully above the system keyboard with the chat header still visible at the top — confirmed by hands-on device walk in Task 3.
- The `keyboardVerticalOffset` ban from M1 Phase 2 (KBD-02 / §6 SC3.a) is intact project-wide.
- The `behavior="padding"` prop from M1 commit `47a52b7` is intact on both chat KAVs.
- Two atomic git commits, one per chat file. No other source file touched. No new i18n keys. No theme-token changes. No dependency changes.
- `npx tsc --noEmit` introduces zero new errors on either chat file vs. the pre-fix baseline (project carries pre-existing unrelated TS errors per M1 `deferred-items.md` — not addressed here).
- Phase 2 inheritance gates above all pass (the other 9 keyboard-controller-using screens shipped by M1/M2/M3 are untouched).
</success_criteria>

<out_of_scope>
- `src/screens/ChatScreen.tsx` (the chat inbox / conversation list) — no `TextInput`, not the bug surface. Untouched.
- Inverted FlatList refactor on `ChatThreadScreen` (iMessage / Telegram style) — explicitly deferred in M1 Phase 2 Plan 02-05 "Deferred / Out of scope". Not in this fix.
- `KeyboardStickyView` / `KeyboardToolbar` primitives from `react-native-keyboard-controller` — M1 D-10 deferred to M2; never adopted in M2/M3 either; not the right tool for "list-above + sticky-input-row" surfaces when a simple structural hoist fixes the bug. Not in this fix.
- `App.tsx` `<KeyboardProvider>` mount at line 1372 — already correct; orchestrator pre-investigation confirmed. Untouched.
- `ChatService.ts` messaging logic, socket handshake, message persistence, mark-as-read, report-conversation, schedule-viewing wiring — unrelated to keyboard avoidance. Untouched.
- `babel.config.js` worklets plugin order, `package.json` keyboard library version, `ios/Podfile`, `android/gradle.properties` `newArchEnabled` — all Phase 2 baseline; untouched.
- The other 9 screens that already use `react-native-keyboard-controller` primitives (LoginScreen, SignupScreen, ForgotPasswordScreen, ResetPasswordScreen, AccountSettingsScreen, CreateListingScreen, LandlordApplicationScreen, MediaCurationScreen, AdminVerificationScreen) — already correctly wrapped per M1 Phase 2 + later milestones. Untouched.
- New i18n strings, new theme tokens, dark-mode color changes — none required; this is a structural-only fix.
- `react-navigation` migration — explicitly out of scope per CLAUDE.md; custom `App.tsx` state machine stays.
- Firebase SDK addition — explicitly banned per CLAUDE.md + memory `no-firebase-sdk.md`.
</out_of_scope>

<open_questions>

**Q1 (non-blocking, for the user after this fix ships):**

M1 Phase 2 PATTERNS / Plan 02-05 explicitly addressed only the "single composer pinned at the bottom of a scrollable form" pattern (auth screens, CreateListing, AccountSettings) plus the original chat screens' shape (FlatList of messages above + input row pinned at bottom). The original Plan 02-05 transform stripped both `behavior` and `keyboardVerticalOffset`, then the device walk forced `behavior="padding"` back (assumption A8 disproven). That recipe assumed the KAV was the screen's outermost frame — but didn't codify the "header-above-KAV" rule explicitly. This quick fix discovers and applies that rule via structural hoist.

Do you want to codify this as a project convention for future chat-shaped screens (i.e., add a note to `.planning/codebase/CONVENTIONS.md` or to a future M4 phase's PATTERNS doc: **"library `<KeyboardAvoidingView behavior='padding'>` MUST be the outermost child of `<SafeAreaView>` — any header rendered as a sibling above it will cause iOS keyboard to cover bottom inputs"**)? If yes, that's a follow-on quick task — not part of this fix.

**Q2 (non-blocking, opportunistic):**

The `styles.composeContent: { flex: 1 }` StyleSheet entry on `ChatComposeScreen.tsx` becomes unused after Task 2. The plan recommends leaving it as harmless dead-code (zero functional cost, smaller diff). Do you want a follow-up cleanup commit to remove it? If yes, that's a 1-line edit; if no, leave it for the next time this file is touched.

</open_questions>

<output>
After completion, create `.planning/quick/260525-fjw-fix-ios-keyboard-covering-chat-input-on-/260525-fjw-SUMMARY.md` per the standard quick-task summary template, documenting:
- The two atomic commit SHAs
- The verification gates that passed
- The device walk outcome from Task 3 (iOS at minimum; Android if tested)
- Any open question disposition from Q1 + Q2 above
- Cross-link to M1 Phase 2 `02-05-SUMMARY.md` + `02-06-SUMMARY.md` + commit `47a52b7` for the inherited `behavior="padding"` decision
</output>
