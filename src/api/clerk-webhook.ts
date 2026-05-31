import { Hono } from 'hono';
import { Webhook } from 'svix';

const clerkWebhook = new Hono();

clerkWebhook.post('/', async (c) => {
  const CLERK_WEBHOOK_SIGNING_SECRET = c.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!CLERK_WEBHOOK_SIGNING_SECRET) {
    return c.json({ error: 'Missing webhook secret' }, 500);
  }

  const svixId = c.req.header('svix-id');
  const svixTimestamp = c.req.header('svix-timestamp');
  const svixSignature = c.req.header('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing svix headers' }, 400);
  }

  const body = await c.req.text();

  const wh = new Webhook(CLERK_WEBHOOK_SIGNING_SECRET);

  let evt: unknown;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return c.json({ error: 'Invalid webhook signature' }, 400)
  }

  if (!evt || typeof evt !== 'object' || !('type' in evt) || !('data' in evt)) {
    return c.json({ error: 'Invalid webhook payload' }, 400)
  }

  const eventType = String((evt as { type?: unknown }).type)
  const data = (evt as { data?: Record<string, unknown> }).data

  console.log('Clerk webhook received:', eventType);

  switch (eventType) {
    case 'user.created':
      console.log('User created:', {
        id: data.id,
        email: data.email_addresses?.[0]?.email_address,
        username: data.username,
      });
      break;

    case 'user.updated':
      console.log('User updated:', {
        id: data.id,
        email: data.email_addresses?.[0]?.email_address,
      });
      break;

    case 'user.deleted':
      console.log('User deleted:', {
        id: data.id,
      });
      break;

    default:
      console.log('Unhandled event:', eventType);
  }

  return c.json({
    success: true,
    event: eventType,
  });
});

export default clerkWebhook;
