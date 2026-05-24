export interface Env {
  AI: any
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

      const diagnostics = await analyzeIssue(env, body)

      return Response.json({
        status: 'issue-detected',
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
