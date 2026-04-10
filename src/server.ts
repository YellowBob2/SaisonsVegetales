import { serve } from "bun";
import path from "path";
import { isUserAuthenticated } from "./backend/authentification";
import { handleApiRequest } from "./backend/routes";

const port = Number(process.env.PORT ?? 3000);
const frontendDir = path.join(import.meta.dir, "frontend");

const server = serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        const userAuthenticated = isUserAuthenticated(req);

        const apiResponse = await handleApiRequest(req);
        if (apiResponse) {
            return apiResponse;
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
        const runtimeConfigScript = `<script></script>`;
        const html = htmlTemplate.replace("</head>", `${runtimeConfigScript}</head>`);
        return new Response(html, {
            headers: { "Content-Type": "text/html" },
        });
    }
});

console.log(`Server running at ${server.url}`);