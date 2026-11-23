import { rootServer } from "@rootsdk/server-app";
import { playerService } from "./playerService";

async function onStarting() {
    await playerService.load();
    rootServer.lifecycle.addService(playerService);
}

(async () => {
    await rootServer.lifecycle.start(onStarting);
})();
