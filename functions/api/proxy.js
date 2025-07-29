/**
 * EdgeOne Function: 代理视频请求以绕过防盗链.
 * 路由: /api/proxy
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const videoUrl = url.searchParams.get('url');

  if (!videoUrl) {
    return new Response('缺少 "url" 查询参数', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 创建一个新的请求到真实的视频地址
  // 关键点: 设置 Referer 请求头来模拟抖音官网的访问
  const proxyRequest = new Request(videoUrl, {
    headers: {
      'Referer': 'https://www.douyin.com/',
      'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
    },
  });

  try {
    // 发起代理请求
    const response = await fetch(proxyRequest);

    if (!response.ok) {
        return new Response(`代理请求失败，状态码: ${response.status}`, { status: response.status });
    }

    // 创建一个新的响应对象，将视频服务器的响应体（视频流）直接返回给客户端
    // 这样可以实现流式传输，避免在函数中消耗大量内存
    const proxyResponse = new Response(response.body, response);

    // 设置必要的 CORS 头部，允许前端 DPlayer 跨域播放
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', 'Range'); // 允许 Range 请求, 用于视频拖动

    return proxyResponse;

  } catch (error) {
    console.error(`[EdgeOne Function Error: /api/proxy] ${error.message}`);
    return new Response(`代理函数出错: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}