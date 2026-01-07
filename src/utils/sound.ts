/**
 * Play a notification sound (chime/beep).
 * Uses a base64 encoded MP3 to avoid external dependencies.
 */
export const playNotificationSound = () => {
    if (typeof window === "undefined") return;

    // Simple "ding" sound (short beep)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create an oscillator for a pleasant beep if we don't use a base64 string, 
    // OR use a base64 data URI. Using oscillator is lighter and doesn't require a large string.

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
