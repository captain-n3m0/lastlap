# LastLap Admin Guide

This guide is for operators managing LastLap riders, tasks, points, and X task verification.

## Access

Admin access is granted when a user matches one of these checks:

- `is_admin` is `true` on the user record.
- `role` is one of `PIT BOSS`, `ADMIN`, or `SUPER ADMIN`.
- The user email matches `ADMIN_EMAIL` from the backend environment.

The backend creates or updates the configured admin account on startup from:

```env
ADMIN_EMAIL=admin@lastlap.com
ADMIN_PASSWORD=change-this-password
```

After changing these values, restart the backend so startup can apply them.

## Admin Dashboard

Open the app and sign in as an admin user. The admin page exposes three main tabs.

### Overview

Use Overview for quick health and activity checks:

- Riders: total non-bot users.
- Active tasks: tasks available to users.
- Total LP: sum of rider points.
- Completions: completed task records.
- Ops snapshot: admin count, verified users, total tasks, and started tasks.
- Recent riders: newest accounts, linked into the rider editor.

### Tasks

Use Tasks to create, edit, pause, and delete missions.

Task fields:

- Task ID: stable task identifier. Leave blank on create to auto-generate from the title. It cannot be edited later.
- Title and Description: user-facing task copy.
- Platform: `LASTLAP`, `CHECKIN`, `X`, `DISCORD`, `WALLET`, or `EMAIL`.
- Cadence: `ONCE` for one-time completion or `DAILY` for daily reset behavior.
- Icon: visual task icon.
- LP: points awarded on completion.
- Order: lower numbers appear earlier.
- External URL: opened when the user starts the task. Use `#` if there is no external destination.
- Active Task: paused tasks are hidden from normal task lists.

Deleting a task also deletes all user progress records for that task. Pause a task instead when you want to preserve historical progress.

### Task Verification

Some tasks can require verification before points are awarded.

Supported verification types:

- `FOLLOW ACCOUNT`: checks whether the linked X account follows the target account.
- `PROFILE UPDATE`: checks whether the rider saved a profile change after starting the task.
- `POST SEARCH QUERY`: searches recent posts from the linked X account for the configured query.
- `REPOST TWEET`: checks whether the linked X account reposted the target tweet.
- `LIKE TWEET`: checks whether the linked X account liked the target tweet.

Verification fields:

- Target: use an account handle for follow tasks, or a tweet URL/id for repost and like tasks. Profile update tasks do not need a target.
- Search Query: used only for post tasks. Example: `@lastlapdotfun OR #LastLap`.

Important behavior:

- Users must link their X account before claiming X-verified tasks.
- Users first start the task, complete the action on X, then return and claim it.
- `PROFILE UPDATE` tasks should use platform `PROFILE`, external URL `/profile`, and verification type `profile_update`. They only verify after the user saves an actual profile change.
- `POST SEARCH QUERY` can require multiple TwitterAPI.io calls because results may be paginated.
- `REPOST TWEET` uses X's repost lookup so quote tweets do not count as reposts.
- `REPOST TWEET` and `LIKE TWEET` use the linked user's X OAuth2 token. Users who linked X before these scopes were added may need to unlink and reconnect X.
- `LIKE TWEET` requires the `like.read` scope.

Backend environment for verification:

```env
X_OAUTH_SCOPES=tweet.read users.read like.read offline.access
TWITTERAPI_IO_API_KEY=your-key
TWITTERAPI_IO_BASE_URL=https://api.twitterapi.io
TWITTERAPI_IO_TIMEOUT=15
TWITTERAPI_IO_MAX_PAGES=5
TWITTERAPI_IO_RETRIES=1
TWITTERAPI_IO_MIN_INTERVAL_SECONDS=0
X_LIKE_VERIFY_MAX_PAGES=5
X_REPOST_VERIFY_MAX_PAGES=5
```

Troubleshooting:

- `X account is not linked`: ask the user to connect X from their profile/login flow.
- `X action was not found`: confirm the target handle/tweet/query is correct and the user performed the action with the linked X account.
- `Update your profile, then try again`: the user started the profile task but has not saved a profile change since starting it.
- `Reconnect your X account with OAuth 2.0`: the user needs to unlink and reconnect X before claiming repost or like tasks.
- `Reconnect your X account to grant like.read`: the user needs to unlink and reconnect X before claiming like tasks.
- `Twitter verification is rate limited`: TwitterAPI.io returned HTTP `429`; confirm the active API key and plan, then retry after the indicated wait.
- `Twitter verification service timed out`: TwitterAPI.io did not respond within `TWITTERAPI_IO_TIMEOUT`; retry later or increase the timeout slightly.

## Rider Management

Use Users to search and edit rider records.

Editable rider fields:

- Role
- Title
- LP
- Tasks completed
- Daily streak
- Admin status
- Email verified status

Safety notes:

- The API blocks an admin from removing their own admin access.
- Directly editing LP overwrites the current point value.
- Point Adjustment is preferred for one-off corrections because it records an admin event with delta and reason.

## API Reference

All admin routes require a valid bearer token for an admin user.

```text
GET    /api/admin/overview
GET    /api/admin/tasks
POST   /api/admin/tasks
PATCH  /api/admin/tasks/{task_id}
DELETE /api/admin/tasks/{task_id}
GET    /api/admin/users?q={query}&limit={limit}
PATCH  /api/admin/users/{user_id}
POST   /api/admin/users/{user_id}/points
```

Point adjustment body:

```json
{
  "delta": 100,
  "reason": "Manual event reward"
}
```

Use a negative `delta` to remove points. The backend will not let LP go below zero.

## Operational Checklist

Before launch:

- Set a strong `ADMIN_PASSWORD`.
- Confirm `ADMIN_EMAIL` belongs to the intended owner.
- Confirm `CORS_ORIGINS` and `FRONTEND_PUBLIC_URL` match the production domain.
- Add X OAuth callback URLs in the X Developer Portal.
- Set `TWITTERAPI_IO_API_KEY` if X follow/post verification is enabled.
- Restart the backend after environment changes.

After launch:

- Prefer pausing tasks over deleting them.
- Keep LP corrections in Point Adjustment with a reason.
- Test each new X task with a real linked X account before announcing it.
- Watch backend logs for TwitterAPI.io and X API `429`, timeout, or invalid-response errors.
