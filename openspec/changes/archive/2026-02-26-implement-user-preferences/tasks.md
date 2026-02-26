# Tasks

## Phase 1: Database & Core Models
- [x] Update `User` model to include `preferences` schema (trackStatus, trackAssignee, schedule). <!-- id: p1-model-updates -->
- [x] Write a migration/default script to ensure existing users have default preferences. <!-- id: p1-default-prefs -->

## Phase 2: Logic Layer Updates
- [x] Update `MonitorService` to respect `trackStatus` and `trackAssignee` toggles. <!-- id: p2-tracking-toggles -->
- [x] Update `MonitorService` to respect `schedule` and `timezone` when sending notifications (queueing during quiet hours). <!-- id: p2-quiet-hours -->

## Phase 3: Interactive Configuration
- [x] Implement `/settings` command in `TelegramNotifier` using Inline Keyboards. <!-- id: p3-settings-cmd -->
- [x] Handle Telegram callback queries to toggle preferences and update the UI message. <!-- id: p3-callback-queries -->

## Phase 4: Verification
- [x] Verify field toggling works (disable Status tracking -> no alerts for Status changes). <!-- id: p4-verify-toggles -->
- [x] Verify quiet hours queuing (mock time or config to test queuing and delayed delivery). <!-- id: p4-verify-schedule -->
- [x] Verify `/settings` UI updates instantly when toggling. <!-- id: p4-verify-ui -->
