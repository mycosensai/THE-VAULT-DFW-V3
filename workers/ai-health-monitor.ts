export interface Env {
  AI: any
  HEALTH_MONITOR_KV?: KVNamespace
}

const WATCH_PATTERNS = [
  'TypeError',
  'UnhandledPromiseRejection',
  'Build failed',
  'npm error',
  'Missing dependency',
  'Module not found',
  'Cloudflare deployment failed'
]

const ONE_HOUR = 60 * 60 * 1000

async function analyzeIssue(env: Env, payload: string) {
  const response = await env.AI.run(
    'alibaba/qwen3.5-397b-a17b',
    {
      messages: [
        {
          role: 'system',
          content:
            'You are a Cloudflare deployment repair agent. Analyze logs and suggest immediate fixes for dependency, routing, Wrangler, Vite, and Clerk deployment problems.'
        },
        {
          role: 'user',
          content: payload
        }
      ],
      stream: false
    },
    {
      gateway: { id: 'default' }
    }
  )

  return response
}

async function canRun(env: Env) {
  if (!env.HEALTH_MONITOR_KV) {
    return true
  }

  const lastRun = await env.HEALTH_MONITOR_KV.get('last-health-check')

  if (!lastRun) {
    return true
  }

  const diff = Date.now() - Number(lastRun)

  return diff >= ONE_HOUR
}

async function markRun(env: Env) {
  if (!env.HEALTH_MONITOR_KV) {
    return
  }

  await env.HEALTH_MONITOR_KV.put(
    'last-health-check',
    String(Date.now())
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const body = await request.text()

      const hasIssue = WATCH_PATTERNS.some((pattern) =>
        body.includes(pattern)
      )

      if (!hasIssue) {
        return Response.json({
          status: 'healthy',
          monitored: true
        })
      }

      const allowed = await canRun(env)

      if (!allowed) {
        return Response.json({
          status: 'throttled',
          cadence: '1h'
        })
      }

      const diagnostics = await analyzeIssue(env, body)

      await markRun(env)

      return Response.json({
        status: 'issue-detected',
        cadence: '1h',
        diagnostics
      })
    } catch (error: any) {
      return Response.json(
        {
          status: 'monitor-failed',
          error: error?.message || 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
}
