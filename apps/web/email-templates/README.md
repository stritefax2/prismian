# Email templates

Branded HTML for Supabase Auth's email flows. Paste each into Supabase
Dashboard → Authentication → Email Templates.

## How these get sent

When you configure Custom SMTP in Supabase (Authentication → Email →
SMTP Settings), all three of these go through your provider (Resend
recommended; ~$0/mo for 3k emails). The templates are stored in
Supabase, so updating them = paste a new HTML body into the dashboard.
No code deploy needed.

## Files

| File | Supabase template | When it fires |
|---|---|---|
| `confirm-signup.html` | Confirm signup | New user registers, before they can log in |
| `invite-user.html` | Invite user | Admin clicks "Invite team" in workspace settings |
| `reset-password.html` | Reset password | User clicks "Forgot password?" on the login page |

## Variables Supabase substitutes

- `{{ .ConfirmationURL }}` — the action link (confirm / invite / reset)
- `{{ .Email }}` — recipient email address
- `{{ .SiteURL }}` — configured site URL (set this to your custom
  domain in Supabase → Authentication → URL Configuration)
- `{{ .Data }}` — custom metadata; for invites we pass
  `workspace_name` and `invited_role` from the API

## Before going live

1. Set Site URL: `https://<your-domain>` (no trailing slash)
2. Add Redirect URLs (exact paths):
   - `https://<your-domain>/dashboard`
   - `https://<your-domain>/reset-password`
   - `https://<your-domain>/invite/accept`
3. Configure SMTP (Resend) with sender `noreply@<your-domain>`
4. Paste all three templates into Supabase Email Templates
5. Send test emails via the "Send test email" button on each template
   to make sure they render in Gmail / Outlook / Apple Mail
