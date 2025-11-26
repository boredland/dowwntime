import http from "node:http";
import https from "node:https";

/**
 * Measure detailed timing of an HTTP request
 */
export const measureRequest = async (
	url: string | URL,
	options: http.RequestOptions,
) => {
	const startAt = Date.now();
	const result = await new Promise<{
		statusCode: number;
		durationMs: number;
	}>((resolve, reject) => {
		let tlsHandshakeAt: number;
		let firstByteAt: number;
		const urlObj = typeof url === "string" ? new URL(url) : url;
		const client = urlObj.protocol === "https:" ? https : http;
		const req = client.request(url, options, (res) => {
			res.on("data", () => {
				// Track when first byte arrives (server response time)
				if (!firstByteAt) {
					firstByteAt = Date.now();
				}
				// Consume the response data
			});
			res.on("end", () => {
				const responseTimeMs = firstByteAt ? firstByteAt - startAt : 0;
				const tlsMs = tlsHandshakeAt ? tlsHandshakeAt - startAt : 0;
				// Duration excludes TLS handshake and payload download
				const durationMs = responseTimeMs - tlsMs;
				resolve({
					statusCode: res.statusCode || 0,
					durationMs: Math.max(0, durationMs), // Ensure non-negative
				});
			});
		});
		req.on("error", (err) => {
			reject(err);
		});
		req.on("socket", (socket) => {
			socket.on("secureConnect", () => {
				tlsHandshakeAt = Date.now();
			});
		});
		req.end();
	});

	return result;
};
