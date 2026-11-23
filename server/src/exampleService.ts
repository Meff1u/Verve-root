import { Client } from "@rootsdk/server-app";
import { EchoRequest, EchoResponse, EchoEvent } from "@verve/gen-shared";
import { EchoServiceBase } from "@verve/gen-server";
import { spawnSync } from "child_process";

async function runDiagnostics(): Promise<string> {
    const lines: string[] = [];

    lines.push("runtime: " + process.platform + " / node " + process.version);

    try {
        const res: Response = await fetch("https://example.com");
        lines.push("fetch: " + res.status);
    } catch (e) {
        lines.push("fetch failed: " + String(e));
    }

    try {
        const result = spawnSync("ffmpeg", ["-version"]);
        lines.push("ffmpeg: " + (result.error ? "error " + result.error.message : "exit " + result.status));
    } catch (e) {
        lines.push("spawn failed: " + String(e));
    }

    return lines.join(" | ");
}

export class EchoService extends EchoServiceBase {
    async echo(request: EchoRequest, client: Client): Promise<EchoResponse> {
        const reply = request.message === "diag" ? await runDiagnostics() : "Echo server: " + request.message;

        const event: EchoEvent = { message: reply };
        this.broadcastCreated(event, "all", client);

        const response: EchoResponse = { message: reply };
        return response;
    }
}

export const echoService = new EchoService();
