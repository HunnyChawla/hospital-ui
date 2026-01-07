/**
 * Play a notification sound (chime/beep).
 */
export const playNotificationSound = () => {
    if (typeof window === "undefined") return;

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5); // Drop to A4

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.warn("AudioContext sound playback failed:", e);
    }
};

/**
 * Check if Text-to-Speech is supported in the current browser.
 */
export const isTTSSupported = () => {
    return typeof window !== "undefined" && !!window.speechSynthesis;
};

/**
 * Announce text using the browser's speech synthesis.
 * More robust implementation for TV/Limited browsers.
 */
export const announceText = (text: string) => {
    if (!isTTSSupported()) {
        console.warn("Speech synthesis not supported in this browser.");
        return;
    }

    // Cancel any ongoing speech to start fresh
    window.speechSynthesis.cancel();

    const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.lang = "en-IN";

        // Find a good voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const preferredVoice = voices.find(v => v.lang.includes("en-IN")) ||
                voices.find(v => v.lang.includes("en-US")) ||
                voices[0];
            utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
    };

    // In some browsers (like Chrome/Opera on TV), voices might not be ready yet
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null; // Prevent multi-triggering
            doSpeak();
        };
    } else {
        doSpeak();
    }
};
