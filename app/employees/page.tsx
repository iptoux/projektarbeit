// Globale Typen, damit TypeScript weiß, welche Callback-Funktionen FileMaker aufrufen kann
declare global {
    interface Window {
        // Standard-Callback, das aus FileMaker per "Perform JavaScript in Web Viewer" aufgerufen werden kann
        onFileMakerResult?: (value: unknown) => void;
        // Kurzer Alias, falls im Script ein kürzerer Name bevorzugt wird
        fmResult?: (value: unknown) => void;
    }
}

type Employee = {
    userID: string;
    personalIdExternal: string;

};