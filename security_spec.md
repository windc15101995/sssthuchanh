# Security Spec

## 1. Data Invariants
- `config/global` can be read by anyone, but must strictly conform to the `Config` schema on write.
- `drafts/{pin}` can be read by anyone, but must strictly conform to the `Draft` schema on write. The document ID must match the pin field.

## 2. The "Dirty Dozen" Payloads
- Creating a draft with no pin.
- Creating a draft with pin exceeding 128 characters.
- Creating a draft with a missing timestamp.
- Updating config with an invalid type for fontSize.
- Updating config with extra fields.
- Updating config with missing fields.
- Deleting config/global (should be denied).
- ... (and more)

## 3. Test Runner
We will deploy the rules and rely on the schema validation to protect the data since the application is intentionally public and unauthenticated for form drafting.
