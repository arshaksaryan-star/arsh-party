export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. Уведомления: бот отправляет сообщение.
    if (request.method === "POST" && /^\/bot\d+:[\w-]+\/sendMessage$/.test(url.pathname)) {
      return fetch("https://api.telegram.org" + url.pathname, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
      });
    }

    // 2. Лента на сайте: публичная страница канала t.me/s/<канал>.
    const channel = url.pathname.match(/^\/s\/([A-Za-z0-9_]{4,64})$/);
    if (request.method === "GET" && channel) {
      return fetch("https://t.me/s/" + channel[1], { headers: { "User-Agent": "Mozilla/5.0" } });
    }

    // 3. Картинки постов — только с CDN Telegram.
    if (request.method === "GET" && url.pathname === "/img") {
      let target;
      try {
        target = new URL(url.searchParams.get("u") || "");
      } catch {
        return new Response("Bad request", { status: 400 });
      }
      if (target.protocol === "https:" && /^cdn\d*\.(telesco\.pe|cdn-telegram\.org)$/.test(target.hostname)) {
        return fetch(target.toString());
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
