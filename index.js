export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const key = url.pathname.substring(1); // URLパスをキーとして取得

        try {
            // R2バケットのオブジェクトを取得
            const object = await env.VIDEO_BUCKET.get(key);
            console.log(object);

            if (!object) {
                return new Response('Not Found', { status: 404 });
            }

            const range = request.headers.get('Range');
            const { size } = object;

            // Content-Typeの動的設定
            const contentType = object.httpMetadata?.contentType ||
                (key.endsWith('.mov') ? 'video/quicktime' : 'application/octet-stream');

            if (range) {
                // Rangeリクエストに対応
                const [start, end] = range.replace(/bytes=/, '').split('-');
                const startByte = parseInt(start, 10);
                const endByte = end ? parseInt(end, 10) : size - 1;

                return new Response(object.body.slice(startByte, endByte + 1), {
                    status: 206,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Range': `bytes ${startByte}-${endByte}/${size}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': endByte - startByte + 1,
                    },
                });
            }

            // 通常のレスポンス
            return new Response(object.body, {
                headers: {
                    'Content-Type': contentType,
                    'Content-Length': size,
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        } catch (error) {
            console.error(error);
            return new Response('Internal Server Error', { status: 500 });
        }
    },
};

