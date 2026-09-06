# Emberwild — App Store Release Plan

Target bundle ID: `com.tilkilab.emberwild`

## Release 1 scope

- Full Emberwild V3 single-player world
- Six autonomous inhabitants with memories and relationships
- Gathering, crafting/building, quests, camp actions and persistent local saves
- Optional NPC voice conversations
- Multiplayer room presence and synchronized player movement
- App Store build disables free-form player chat and free-form public player names until moderation/report/block tooling is production-ready
- Privacy and support pages are accessible from inside the game

## Native build

The iOS wrapper lives in `mobile/` and uses Capacitor 8.

1. Build the web game with `NEXT_PUBLIC_APP_STORE_BUILD=1 npx next build`.
2. `cd mobile && npm install`.
3. `npx cap add ios` on first setup.
4. Add microphone and speech-recognition permission purpose strings to `Info.plist`.
5. `npx cap sync ios`.
6. Open the project with `npx cap open ios` and select the Apple Developer signing team.
7. Archive with the current App Store-supported Xcode/iOS SDK and upload to App Store Connect.

The `Emberwild iOS Native Check` GitHub Actions workflow performs an unsigned simulator build so native-wrapper regressions are caught before signing.

## App Store Connect draft metadata

**Name:** Emberwild

**Subtitle:** A living woodland world

**Primary category:** Games

**Suggested secondary category:** Simulation

**Description:**

Enter Mosswood Hollow, a living woodland settlement where inhabitants remember what happens, pursue their own needs, form relationships, and react to the changing world around them. Explore the forest, gather resources, build community projects, share meals, speak with inhabitants, and meet other travelers in shared multiplayer rooms.

Every visit continues the story. Your progress is saved locally, inhabitants carry memories forward, and the settlement changes as you help it grow.

**Keywords draft:** simulation,world,agents,adventure,forest,multiplayer,story,ai,life

**Privacy Policy URL:** publish the exported `/privacy/` page on the permanent Emberwild/TILKI LAB website before submission.

**Support URL:** publish the exported `/support/` page on the permanent Emberwild/TILKI LAB website before submission.

## App Review notes draft

- Emberwild is a game, not a repackaged website. The iOS binary embeds the full game bundle and works as an app experience.
- Microphone and speech recognition are optional and only used when the player explicitly taps the microphone while speaking with an inhabitant.
- Denying microphone/speech permissions does not block gameplay; text interaction remains available.
- The first App Store release uses presence-only multiplayer. Free-form room chat is disabled in the App Store build.
- Save data is local to the device in the current release; no login is required.

## Required before public submission

- Active Apple Developer Program membership
- Final App Store icon and launch artwork
- Real App Store screenshots from supported iPhone/iPad sizes
- Permanent public Privacy Policy and Support URLs
- TestFlight testing on at least one recent iPhone and one older supported iPhone
- Voice verification inside the native WKWebView; if browser speech recognition is unreliable, replace it with a native Speech framework bridge before release
- Review multiplayer relay privacy/security and move from the public demo relay to TILKI LAB-controlled infrastructure before broad launch
- Complete App Store privacy and age-rating questionnaires accurately
- Choose final price (free is recommended for v1 unless monetization is implemented)
