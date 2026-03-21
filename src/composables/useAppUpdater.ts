import { ask, message } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { shallowRef } from "vue";

export type AppUpdaterMessageKind = "info" | "error";

interface UseAppUpdaterOptions {
    notify: (text: string, kind?: AppUpdaterMessageKind, durationMs?: number) => void;
}

type UpdateCheckSource = "startup" | "manual";

interface UpdateLike {
    body?: string | null;
    currentVersion: string;
    version: string;
}

export function useAppUpdater(options: UseAppUpdaterOptions) {
    const isChecking = shallowRef(false);
    const isInstalling = shallowRef(false);
    const startupCheckScheduled = shallowRef(false);

    async function checkForUpdates(source: UpdateCheckSource = "manual") {
        if (isChecking.value || isInstalling.value) {
            if (source === "manual") {
                options.notify("An update check is already in progress.", "info");
            }
            return;
        }

        isChecking.value = true;

        try {
            const update = await check();

            if (!update) {
                if (source === "manual") {
                    await message("You're already on the latest version of KanStack.", {
                        title: "No Updates Available",
                        kind: "info",
                    });
                }
                return;
            }

            const shouldInstall = await ask(buildUpdatePrompt(update), {
                title: "Update Available",
                kind: "info",
                okLabel: "Update Now",
                cancelLabel: "Later",
            });

            if (!shouldInstall) {
                return;
            }

            isInstalling.value = true;
            options.notify(`Downloading KanStack ${update.version}...`, "info", 0);

            await update.downloadAndInstall((event) => {
                if (event.event === "Finished") {
                    options.notify(`Installing KanStack ${update.version}...`, "info", 0);
                }
            });

            options.notify("Restarting to finish the update...", "info", 0);
            await relaunch();
        } catch (error) {
            if (source === "startup") {
                console.warn("Automatic update check failed.", error);
                return;
            }

            const detail = error instanceof Error ? error.message : String(error);
            await message(`Could not check for updates.\n\n${detail}`, {
                title: "Update Check Failed",
                kind: "error",
            });
        } finally {
            isChecking.value = false;
            isInstalling.value = false;
        }
    }

    function scheduleStartupCheck(delayMs = 2500) {
        if (import.meta.env.DEV || startupCheckScheduled.value) {
            return;
        }

        startupCheckScheduled.value = true;
        window.setTimeout(() => {
            void checkForUpdates("startup");
        }, delayMs);
    }

    return {
        checkForUpdates,
        scheduleStartupCheck,
    };
}

function buildUpdatePrompt(update: UpdateLike) {
    const parts = [
        `KanStack ${update.version} is available. You are currently on ${update.currentVersion}.`,
    ];

    if (update.body?.trim()) {
        parts.push(`Release notes:\n${update.body.trim()}`);
    }

    parts.push("Install the update now? KanStack will relaunch when it is ready.");

    return parts.join("\n\n");
}
