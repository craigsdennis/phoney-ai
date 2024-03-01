# Phoney AI

This application uses [Cloudflare Workers AI](https://ai.cloudflare.com/), [Twilio](https://twilio.com/docs), and [AssemblyAI](https://assemblyai.com).

Your phone is an input and output device.

You'll need to buy a Twilio Phone Number to use this.

## Getting started

You'll need to buy a Twilio Phone Number to use this.

Install the [Twilio CLI](https://twil.io/cli).

Get yourself an [AssemblyAI](https://assemblyai.com) key.

Copy the [.dev.vars.example](.dev.vars.example) file to .dev.vars.

## Develop

```bash
npm install
```

```bash
npx wrangler login
```

```bash
npm run dev
```

Find yourself a tunnelling situation. I [suggest cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/)

Wire up your Twilio number locally to your tunnel

```bash
twilio phone-numbers:list
```

```bash
twilio phone-numbers:update +13216459876 --sms-url="https://<YOUR-TUNNEL-URL>/incoming-message" --voice-url="https://<YOUR-TUNNEL-URL/incoming-voice"
```

## Deploy

```bash
npx wrangler deploy
```

Now wire your Twilio numbers up to the deployed application.
