import { Buffer } from 'node:buffer';
import { Ai } from '@cloudflare/ai';

import { Hono } from 'hono';
import { AssemblyAI } from 'assemblyai';

const app = new Hono();

app.post('/incoming-message', async (c) => {
	const body = await c.req.parseBody();
	const ai = new Ai(c.env.AI);
	const response = await ai.run('@hf/thebloke/llama-2-13b-chat-awq', {
		messages: [
			{
				role: 'system',
				content: `
        You are a translator.
        The user is going to send in a text message and
        you are going to translate it into the early days of the 90's
        of how everyone used to text, when number of characters mattered.
        Use emoticons instead of emojis.`,
			},
			{ role: 'user', content: body.Body },
		],
	});
	console.log('response', response.response);
	return c.body(
		`<Response>
    <Message>${response.response}</Message>
    </Response>`,
		200,
		{ 'Content-Type': 'application/xml' }
	);
});

app.post('/incoming-call', async (c) => {
  const url = new URL(c.req.url);
	return c.body(
		`
  <Response>
    <Say voice="Google.en-US-Wavenet-A">You can do text to speech like this. It's not as impressive as some of the GenAI models, but hoo boy is it easy!</Say>
    <Say voice="Google.en-US-Wavenet-B">Tell me what you are building after the beep.</Say>
    <Record transcribe="true" transcribeCallback="https://${url.host}/handle-transcription" />
  </Response>
  `,
		200,
		{ 'Content-Type': 'application/xml' }
	);
});

app.post("/handle-transcription", async (c) => {
  const body = await c.req.parseBody();
  console.log(`Transcription received: ${body.TranscriptionText}`);
  return c.json({success: true});
});


app.all('/realtime', (c) => {
	const url = new URL(c.req.url);
	return c.text(
		`<Response>
			<Say>Connecting</Say>
			<Connect>
				<Stream url="wss://${url.host}/stream" />
			</Connect>
		</Response>`,
		200,
		{ 'Content-Type': 'application/xml' }
	);
});

async function onConnected(env, server) {
	try {
		console.log('onConnected', server);
		const client = new AssemblyAI({
			apiKey: env.ASSEMBLYAI_API_KEY,
		});
		const token = await client.realtime.createTemporaryToken({ expires_in: 120 });
		const transcriber = client.realtime.transcriber({
			// Twilio media stream sends audio in mulaw format
			encoding: 'pcm_mulaw',
			// Twilio media stream sends audio at 8000 sample rate
			sampleRate: 8000,
			token,
		});
		const connectionPromise = transcriber.connect();
		server.addEventListener('message', async (event) => {
			const msg = JSON.parse(event.data);
			switch (msg.event) {
				case 'start':
					console.log('Started', msg);
					break;
				case 'media':
					try {
						await connectionPromise;
						transcriber.sendAudio(Buffer.from(msg.media.payload, 'base64'));
					} catch (err) {
						console.error(err);
						throw err;
					}
					break;
			}
			// TODO: Handle close?
		});
		transcriber.on('transcript', (transcript) => {
			if (transcript.message_type === 'PartialTranscript') {
				console.log('Partial:', transcript.text);
			} else {
				console.log('Final:', transcript.text);
			}
		});
		transcriber.on('error', (err) => {
			console.error(err);
		});
		transcriber.on('open', ({ sessionId }) => {
			console.log(`Session opened with ID: ${sessionId}`);
		});
	} catch (err) {
		console.error(err);
	}
}

app.get('/stream', async (c) => {
	const upgradeHeader = c.req.header('Upgrade');
	if (upgradeHeader !== 'websocket') {
		return c.error('Expected Upgrade: websocket', { status: 426 });
	}
	const webSocketPair = new WebSocketPair();
	const [client, server] = Object.values(webSocketPair);
	console.log('Server connecting');
	server.accept();
	onConnected(c.env, server);
	return new Response(null, {
		status: 101,
		webSocket: client,
	});

	// Upgrade
	//const header =
	// Get server and client
	// Set up handler
	// Return client
});

export default app;
