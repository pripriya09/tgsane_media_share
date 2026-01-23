export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      const pathname = url.pathname;
  
      // Try to fetch the requested file from assets
      let response = await env.ASSETS.fetch(request);
  
      // If it's a 404 and doesn't look like a static file, serve index.html
      if (response.status === 404) {
        // Check if it's NOT a static file (no file extension)
        if (!pathname.includes('.')) {
          // Serve index.html for SPA routes
          const indexUrl = new URL('/index.html', url.origin);
          const indexRequest = new Request(indexUrl, request);
          response = await env.ASSETS.fetch(indexRequest);
        }
      }
  
      return response;
    }
  };
  