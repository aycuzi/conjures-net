# CONJURES

The isolated CONJURES website and application platform for `conjures.net`.

## Deployment

Deploy as a Node.js service using `npm start`. Copy every key from `.env.example` into the deployment's service variables. OAuth callback URLs are:

- `https://conjures.net/auth/discord/callback`
- `https://conjures.net/auth/roblox/callback`

The service uses the existing CONJURES API for durable application definitions and submissions.
