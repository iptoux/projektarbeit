'use client';

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// Globale Typen, damit TypeScript weiß, welche Callback-Funktionen FileMaker aufrufen kann
declare global {
    interface Window {
        // Standard-Callback, das aus FileMaker per "Perform JavaScript in Web Viewer" aufgerufen werden kann
        onFileMakerResult?: (value: unknown) => void;
        // Kurzer Alias, falls im Script ein kürzerer Name bevorzugt wird
        fmResult?: (value: unknown) => void;
    }
}

type Curriculum = {
    curriculumID: string;
    title?: string;
    description?: string;
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CurriculaFetcher() {
    const [total, setTotal] = useState(0);
    const [processed, setProcessed] = useState(0);
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [currentTitle, setCurrentTitle] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>();

    // Zustand für Rückgabewerte aus FileMaker
    const [fmRawValue, setFmRawValue] = useState<unknown>();
    const [fmParsedValue, setFmParsedValue] = useState<unknown>();
    const [fmParseError, setFmParseError] = useState<string | undefined>(undefined);

    // Registriere globale Callback-Funktionen, die FileMaker aufrufen kann.
    // In FileMaker (ab v19) über den Script-Schritt "JavaScript in Web Viewer ausführen"
    // mit Funktionsnamen "onFileMakerResult" oder "fmResult" aufrufbar.
    useEffect(() => {
        const handler = (value: unknown) => {
            try {
                setFmRawValue(value);
                setFmParseError(undefined);
                // Wenn Value ein String ist, versuchen JSON zu parsen, sonst direkt übernehmen
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                        try {
                            const parsed = JSON.parse(trimmed);
                            setFmParsedValue(parsed);
                        } catch (e) {
                            setFmParsedValue(trimmed);
                            setFmParseError((e as Error).message);
                        }
                    } else {
                        setFmParsedValue(trimmed);
                    }
                } else {
                    setFmParsedValue(value);
                }
            } catch (e) {
                console.error('Fehler bei Verarbeitung des FileMaker-Rückgabewerts:', e);
                setFmParseError((e as Error).message);
            }
        };

        // Exponiere die Handler-Referenz global
        window.onFileMakerResult = handler;
        window.fmResult = handler;
        console.log('[WebViewer] onFileMakerResult/fmResult registriert');

        return () => {
            // Beim Unmount entfernen
            if (window.onFileMakerResult === handler) window.onFileMakerResult = undefined;
            if (window.fmResult === handler) window.fmResult = undefined;
        };
    }, []);

    const fmPretty = useMemo(() => {
        try {
            if (fmParsedValue === undefined) return undefined;
            if (typeof fmParsedValue === 'string') return fmParsedValue;
            return JSON.stringify(fmParsedValue, null, 2);
        } catch {
            return String(fmParsedValue);
        }
    }, [fmParsedValue]);

    const processCurricula = async (items: Curriculum[]) => {
        setTotal(items.length);
        setProcessed(1);
        if (items.length === 0) {
            console.log("Keine Curricula gefunden. Nichts zu bearbeiten.");
            return;
        }

        console.log(`Starte Bearbeitung von ${items.length} Curricula...`);

        for (let i = 0; i < items.length; i++) {
            const c = items[i];
            setCurrentId(c.curriculumID);
            setCurrentTitle(c.title ?? c.description ?? undefined);

            console.log(`(${i + 1}/${items.length}) Beginne Verarbeitung: ${c.curriculumID}`);
            // @ts-expect-error Built-In FileMaker Scripting Function. Wird im FileMaker Webviewer verfügbar sein.
            try { FileMaker?.PerformScriptWithOption?.("Hello", JSON.stringify({ "curriculumID":c.curriculumID, title: c.title, description: c.description })); } catch {}

            // Simuliere mehrere Schritte pro Curriculum
            const steps = 3;
            for (let s = 1; s <= steps; s++) {
                console.log(`→ [${c.curriculumID}] Schritt ${s}/${steps}...`);
                await sleep(700);
            }

            console.log(`Fertig verarbeitet: ${c.curriculumID}`);

            if (i < items.length - 1) {
                setProcessed((prev) => prev + 1);
            }
        }

        setCurrentId(undefined);
        setCurrentTitle(undefined);
        console.log("Bearbeitung aller Curricula abgeschlossen.");

    };

    const run = async () => {
        setLoading(true);
        setError(undefined);
        try {
            const res = await fetch("/api/curricula");
            const json = await res.json();
            if (json.success) {
                const items: Curriculum[] = json.data.value ?? [];
                await processCurricula(items);
            } else {
                setError(JSON.stringify(json.error ?? "Unknown error"));
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <Button onClick={run} disabled={loading} variant={"default"}>
                {loading ? "Bearbeitung läuft..." : "Curricula bearbeiten"}
            </Button>
            {error && <p className="text-red-500 mt-2">Fehler: {error}</p>}

            <div className="mt-4 text-sm text-muted-foreground space-y-2">
                {total > 0 && (
                    <p>
                        Fortschritt: {processed}/{total}
                        {currentId ? ` — aktuell: ${currentId}${currentTitle ? " — " + currentTitle : ""}` : processed === total && total > 0 ? " — abgeschlossen" : ""}
                    </p>
                )}
                {total === 0 && !loading && !error && (
                    <p>Klicke auf &quot;Curricula bearbeiten&quot;, um die Verarbeitung zu starten.</p>
                )}

                <div className="mt-4">
                    <p className="font-medium text-foreground">Rückgabewert aus FileMaker</p>
                    {!fmPretty && !fmParseError && (
                        <p className="text-muted-foreground">Noch kein Wert empfangen.</p>
                    )}
                    {fmPretty && (
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">{fmPretty}</pre>
                    )}
                    {fmParseError && (
                        <p className="text-xs text-amber-600 mt-1">Hinweis: JSON-Parsing fehlgeschlagen: {fmParseError}. Rohwert wird angezeigt.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
