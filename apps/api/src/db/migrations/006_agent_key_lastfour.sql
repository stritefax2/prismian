-- Store the last 4 characters of the raw agent key so the UI can display
-- `pr_sk_••••xxxx` identifiers — matches the Stripe/GitHub pattern and
-- lets users distinguish keys at a glance after creation.
--
-- The last 4 characters of a 32-byte hex key give us ~65k-way ambiguity,
-- which is a reasonable tradeoff: enough entropy to be useful as a hint,
-- not enough to narrow down the full key meaningfully.

ALTER TABLE agent_keys
  ADD COLUMN last_four TEXT;
