# Tasks for improve-notification-format

- [x] 1. Update the `NotificationPayload` interface (if necessary) or `TelegramNotifier.notify` to accept/fetch the user's timezone.
- [x] 2. Create a date formatting utility function using `Intl.DateTimeFormat` configured with the specific timezone.
- [x] 3. Refactor the `formatMessage` method in `TelegramNotifier` to use the new layout: bold header with Issue Key + Summary, clear changes list, and a single formatted timestamp footer.
- [x] 4. Remove `Detected at` and `Stable since` from the final text output.
- [x] 5. Run tests to ensure notification formatting works without throwing errors and the timezone is applied correctly.
