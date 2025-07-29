// 你的真实 API 域名
const API_DOMAIN = 'dyapi.hbum.de';

/**
 * EdgeOne Function: 解析抖音分享链接.
 * 路由: /api/parse
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const douyinUrl = url.searchParams.get('url');
  const fetchVideoInfo = url.searchParams.has('data');

  if (!douyinUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // 根据请求参数，决定是获取视频元数据还是播放链接
  const targetUrl = fetchVideoInfo
    ? `https://${API_DOMAIN}?data&url=${encodeURIComponent(douyinUrl)}`
    : `https://${API_DOMAIN}?url=${encodeURIComponent(douyinUrl)}`;

  try {
    // 如果只是请求视频信息 JSON
    if (fetchVideoInfo) {
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error('Failed to fetch video info');
      const jsonData = await response.json();
      return new Response(JSON.stringify(jsonData), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 如果是请求视频链接
    // 1. 先从你的 API 获取会 302 跳转的链接
    const initialResponse = await fetch(targetUrl);
    if (!initialResponse.ok) {
        throw new Error(`API call failed with status: ${initialResponse.status}`);
    }
    const originalUrl = await initialResponse.text();

    // 2. 请求这个会跳转的链接，获取最终地址
    const finalResponse = await fetch(originalUrl, { referrerPolicy: "no-referrer" });
    if (!finalResponse.ok) {
        throw new Error(`Failed to follow redirect from: ${originalUrl}`);
    }
    const finalUrl = finalResponse.url;

    // 3. 将两个链接都返回给前端
    const responsePayload = {
        originalUrl: originalUrl,
        finalUrl: finalUrl,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    console.error(`[EdgeOne Function Error: /api/parse] ${error.message}`);
    return new Response(JSON.stringify({ error: 'Failed to process request in EdgeOne Function.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}