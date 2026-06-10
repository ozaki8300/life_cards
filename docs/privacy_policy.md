# Privacy Policy

Effective date: 2026-06-10

Life Cards is an app for creating, saving, viewing, and sharing personal cards. This Privacy Policy explains what information Life Cards collects, how it is used, and how users can request deletion of their account and data.

## Information We Collect

Life Cards may collect and store the following information when you use the app:

- Account information from Google Auth, such as your user identifier, email address, and basic profile information provided by Google.
- Profile information you enter in Life Cards, such as display name.
- Card content you create, including card titles, comments, notes, links, dates, favorite status, deck names, and reencounter metadata.
- Images you upload or attach to cards.
- Share Card data when you create a share link, including a snapshot of the shared card content, creator label, share type, expiration date, and usage counts.
- Technical information necessary for authentication, storage, security, and app operation.

## How We Use Information

Life Cards uses your information to:

- Provide account sign-in and authentication.
- Save and sync your cards, decks, images, profile, and reencounter data.
- Display your cards across supported devices.
- Generate and manage Share Card links.
- Maintain account deletion and data cleanup workflows.
- Improve reliability, safety, and app operation.

Life Cards does not sell your personal data.

## Where Data Is Stored

Life Cards uses Supabase for authentication, database storage, and file storage.

Your account and app data may be stored in Supabase, including:

- Authentication records.
- Cards, decks, and reencounter data.
- Profile data.
- Uploaded card images.
- Share Card records.

Some data may also be stored locally on your device to support app behavior. When account deletion succeeds, Life Cards attempts to remove local Life Cards data stored under `life_cards.*`.

## Images

When you upload images to cards, Life Cards may compress and store those images in Supabase Storage. Images are stored under a user-specific path, such as:

```txt
users/{userId}/cards/{cardId}/front.webp
```

Uploaded images are used to display your cards and are not intentionally made public unless included in a Share Card workflow.

## Share Card Links

When you create a Share Card link, Life Cards stores a snapshot of the card content needed to display the shared card. A Share Card link may be viewable by anyone who has the URL until it expires or is deleted.

Do not share cards containing sensitive personal information, confidential business information, passwords, private credentials, or information you do not have permission to share.

When your account is deleted, Life Cards attempts to delete Share Card records associated with your account.

## Account Deletion

You can request account deletion from within the app through the account menu.

When account deletion succeeds, Life Cards deletes or attempts to delete:

- Your account.
- Cards, decks, and reencounter data.
- Profile data.
- Uploaded images.
- Share Card links associated with your account.
- Local Life Cards data stored on the device under `life_cards.*`.

Deletion may be irreversible. Some information may remain temporarily in backups, logs, or systems operated by service providers, where permitted by law and only for the time necessary for security, compliance, or operational purposes.

## Third-Party Services

Life Cards uses third-party services including:

- Google Auth for sign-in.
- Supabase for authentication, database, and storage.

Your use of these services may also be subject to their own privacy policies and terms.

## User Responsibility

You are responsible for the content you create, upload, save, and share through Life Cards. You should only upload or share content that you own or have permission to use.

## Children

Life Cards is not intended for children under the age required by applicable law to use online services without parental consent. If you believe a child has provided personal information through Life Cards, please contact us.

## Contact

For privacy questions, account deletion issues, or data requests, contact:

```txt
lifecards.app@gmail.com
```

## Changes

This Privacy Policy may be updated from time to time. The updated version will be posted in the app or on the Life Cards website with a new effective date.

## Operator

Life Cards  
Operated by K  
Japan
