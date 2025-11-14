export async function onRequest(context) {
  const { params } = context;
  const code = params.code || '';
  const origin = context.request.headers.get('X-Forwarded-Host')
    ? `https://${context.request.headers.get('X-Forwarded-Host')}`
    : new URL(context.request.url).origin;

  const registerUrl = `${origin}/register?ref=${encodeURIComponent(code)}`;

  const html = `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>邀请注册 · 邀请码 ${code}</title>
      <link rel="icon" href="/icons/icon-192.png" />
      <!-- Open Graph -->
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="电商商城" />
      <meta property="og:title" content="电商商城 · 邀请有礼" />
      <meta property="og:description" content="使用推荐码 ${code} 注册，立享奖励。邀请好友一起购物！" />
      <meta property="og:url" content="${origin}/invite/${code}" />
      <meta property="og:image" content="/icons/icon-512.png" />
      <!-- Twitter Card -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="电商商城 · 邀请有礼" />
      <meta name="twitter:description" content="使用推荐码 ${code} 注册，立享奖励。邀请好友一起购物！" />
      <meta name="twitter:image" content="/icons/icon-512.png" />
      <!-- Fast redirect for browsers -->
      <meta http-equiv="refresh" content="0;url=${registerUrl}" />
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f9fafb;color:#111827;margin:0}
        .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center}
        .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;max-width:420px;width:100%;box-shadow:0 1px 2px rgba(0,0,0,.05)}
        .btn{display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none}
        .code{font-family:monospace;font-weight:600}
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <h1 style="margin:0 0 8px">邀请注册</h1>
          <p style="margin:0 0 12px">使用推荐码 <span class="code">${code}</span> 注册，立享奖励。</p>
          <a class="btn" href="${registerUrl}">前往注册</a>
        </div>
      </div>
    </body>
  </html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
}

