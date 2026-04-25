import { serve } from "bun";
import path from "path";
import { handleApiRequest } from "./backend/routes";

const port = Number(process.env.PORT ?? 3000);
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? "";
const frontendDir = path.join(import.meta.dir, "frontend");

const assetsDir = path.join(import.meta.dir, "..", "assets");

const server = serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        const apiResponse = await handleApiRequest(req);
        if (apiResponse) {
            return apiResponse;
        }

        if (url.pathname.startsWith("/assets/")) {
            const assetName = url.pathname.slice("/assets/".length);
            const assetPath = path.join(assetsDir, assetName);
            try {
                const file = Bun.file(assetPath);
                if (!(await file.exists())) {
                    return new Response("Not found", { status: 404 });
                }

                return new Response(file.stream(), {
                    headers: { "Content-Type": file.type ?? "application/octet-stream" }
                });
            } catch {
                return new Response("Not found", { status: 404 });
            }
        }

        if (url.pathname.startsWith("/styles/")) {
            const stylePath = path.join(frontendDir, url.pathname.slice(1));
            try {
                const file = Bun.file(stylePath);
                if (!(await file.exists())) {
                    return new Response("Not found", { status: 404 });
                }

                return new Response(file.stream(), {
                    headers: { "Content-Type": "text/css" }
                });
            } catch {
                return new Response("Not found", { status: 404 });
            }
        }
        
        if (url.pathname === "/index.tsx") {
            const transpiled = await Bun.build({
                entrypoints: [path.join(frontendDir, "index.tsx")],
            });

            if (!transpiled.outputs || transpiled.outputs.length === 0) {
                return new Response("Build failed", { status: 500 });
            }

            const firstOutput = transpiled.outputs[0];
            if (!firstOutput) {
              return new Response("Build failed", { status: 500 });
            }

            const output = await firstOutput.text();
            return new Response(output, {
                headers: { "content-type": "text/javascript" }
            });
        }

        const htmlTemplate = await Bun.file(path.join(frontendDir, "index.html")).text();
        const runtimeConfigScript = `<script>window.__CLERK_PUBLISHABLE_KEY__ = "${clerkPublishableKey}";</script>`;
        const html = htmlTemplate.replace("</head>", `${runtimeConfigScript}</head>`);
        return new Response(html, {
            headers: { "Content-Type": "text/html" },
        });
    }
});

console.log(`Server running at ${server.url}`);