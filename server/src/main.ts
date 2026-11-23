import { rootServer } from "@rootsdk/server-app";
import { libraryService } from "./libraryService";
import { playerService } from "./playerService";

async function onStarting() {
    await playerService.load();
    playerService.watchListeners();
    rootServer.lifecycle.addService(playerService);
    rootServer.lifecycle.addService(libraryService);
}

(async () => {
    await rootServer.lifecycle.start(onStarting);
})();
