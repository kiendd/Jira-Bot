# Tasks

## Phase 1: Foundation (Core Logic)
- [x] Initialize Node.js Project (Typescript, Jira.js) <!-- id: p1-init -->
- [x] Implement Jira Client (Auth & Polling) <!-- id: p1-jira -->
- [x] Implement Debounce Logic (In-memory) <!-- id: p1-debounce -->
- [x] Implement Console Notification <!-- id: p1-console -->
- [x] Verify Phase 1 (Single User, Console Output) <!-- id: p1-verify -->

## Phase 2: Telegram Integration
- [x] Implement Telegram Bot Client <!-- id: p2-telegram -->
- [x] Replace Console Notification with Telegram <!-- id: p2-notify -->
- [x] Verify Phase 2 (Single User, Telegram Output) <!-- id: p2-verify -->

## Phase 3: Multi-user & Persistence
- [x] Implement MongoDB Connection <!-- id: p3-mongo -->
- [x] Implement User Model & Persistence (add `jql` and `isActive` fields) <!-- id: p3-user-model -->
- [x] Implement State Model & Persistence <!-- id: p3-state-model -->
- [x] Refactor Polling Service for Multi-user <!-- id: p3-refactor -->
- [x] Implement User Management Commands (`/setup`, `/start`, `/stop`, `/status`, `/jql`) <!-- id: p3-commands -->
- [x] Verify Phase 3 (Multi-user, DB Persistence, Custom JQL) <!-- id: p3-verify -->

## Phase 4: Security & Resilience
- [x] Implement Encryption Service (AES-256) <!-- id: p4-encryption -->
- [x] Integrate Encryption with User Storage <!-- id: p4-integration -->
- [x] Implement API Rate Limit Handling (HTTP 429 Backoff) <!-- id: p4-rate-limits -->
- [x] Implement Auth Failure Notifications (`isActive = false`) <!-- id: p4-auth-errors -->
- [x] Implement Smart Diff Message Formatting (HTML/MarkdownV2) <!-- id: p4-message-format -->
- [x] Verify Phase 4 (Encrypted Tokens, Resilience, Formatting) <!-- id: p4-verify -->

