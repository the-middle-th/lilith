# LILITH P0 reliability gate — UI-017

Status: approved specification; local automated implementation checks pass. Exact-HEAD hosted CI is recorded on the PR; independent review remains pending. Every fixture is mock_data:true and prototype_only:true. No release/production authority.

## A. Owner Inbox authorization

Operations destination is null; status BLOCKED_OWNER_AUTHORIZATION; notification_sent:false. Normal synthetic guest sessions cannot access Operations records. Test-only signed scoped Operations sessions exercise positive/negative authorization; no public role-grant endpoint. Cross-request resource and image access fails closed, including idempotency replay. No email, LINE or external recipient is inferred.

## B. Readable, operable consent

Accept/Decline equally operable, no preselected state, mobile 390px and 320px, desktop, keyboard, 200% text. Demo wording visibly REVIEW_REQUIRED; accepted demo consent authorizes synthetic submission only. Persist decision/version; missing/declined/current-notice-invalid consent denies review. Pre-review edit resets consent to unset/version null/time null and notice unacknowledged, clears committed images atomically, increments revision, and invalidates delayed client restore callbacks. Post-review edits are denied. Decline retains local synthetic draft and truthfully says nothing was sent.

## C. Staged image persistence

Optional zero to four shipped geometric synthetic images. No file ingestion or real photos. Unsaved preview memory only; saved indicator only after durable consented transaction. Fifth image rejected, including concurrency. Retry/double click/lost response replay one durable result. Refresh/reopen/server restart restore committed images with valid owner session; no cross-request leakage. Failed saves retain the previous gallery; decline/edit clear it. Test-only failure hooks stay internal to the harness.

Acceptance evidence: actual unit, HTTP contract and browser logs plus boundary regression, exact HEAD and CI. This file never labels an unrun test PASS.
