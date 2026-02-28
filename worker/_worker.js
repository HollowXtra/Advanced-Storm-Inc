export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname.includes('/api/weather') || url.pathname === '/') {
      try {
        const stationId = url.searchParams.get('obtId') || 'G3738'; 
        const TARGET_API_URL = `https://szqxapp1.121.com.cn/sztq-app/v6/v7/meteorologicalObt/topics?obtId=${stationId}&cityId=28060159493`;

        // 终极伪装：加入语言、缓存控制、多种内容接收类型
        const targetResponse = await fetch(TARGET_API_URL, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://szqxapp1.121.com.cn/",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache"
          }
        });
        
        // 先把结果作为纯文本拿下来，不要急着 .json()
        const rawText = await targetResponse.text();
        
        try {
            // 尝试将纯文本解析为 JSON
            const resJson = JSON.parse(rawText);
            const weatherData = resJson.result || {};

            return new Response(JSON.stringify(weatherData), {
              headers: { ...corsHeaders, "Content-Type": "application/json;charset=UTF-8" }
            });

        } catch (parseError) {
            // 解析失败：说明被防火墙拦截，返回了 HTML
            // 我们把防火墙的拦截内容截取前 200 个字符展示出来
            return new Response(JSON.stringify({ 
                error: "遭遇气象局防火墙拦截 (WAF Blocked)", 
                details: parseError.message,
                raw_response: rawText.substring(0, 200) + "..."
            }), { 
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json;charset=UTF-8" }
            });
        }

      } catch (error) {
        return new Response(JSON.stringify({ error: "代理请求彻底失败", details: error.message }), { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("API 路由未找到", { status: 404 });
  }
};