/**
 * Play a notification sound (chime/beep).
 * Uses a base64 encoded MP3 to avoid external dependencies.
 */
export const playNotificationSound = () => {
    if (typeof window === "undefined") return;

    // Simple "ding" sound (short beep)
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
};

/**
 * Announce text using the browser's speech synthesis.
 */
export const announceText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    utterance.lang = "en-IN"; // Prefer Indian English if available

    // Find a good voice if possible
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const preferredVoice = voices.find(v => v.lang.includes("en-IN")) || voices.find(v => v.lang.includes("en-US"));
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
    }

    window.speechSynthesis.speak(utterance);
};
