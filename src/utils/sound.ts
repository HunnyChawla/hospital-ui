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
export const announceText = (text: string, lang: string = "en-IN", gender: 'male' | 'female' = 'female') => {
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
        utterance.lang = lang;

        // Find a good voice
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            // Heuristic to check if a voice is male or female
            const isGenderMatch = (voice: SpeechSynthesisVoice) => {
                const name = voice.name.toLowerCase();
                const uri = voice.voiceURI.toLowerCase();
                const maleKeywords = ['male', 'david', 'mark', 'ravi', 'rishi', 'fred', 'daniel', 'grandpa', 'rocko', 'reed', 'albert', 'premium', 'man'];
                const femaleKeywords = ['female', 'zira', 'hazel', 'kalpana', 'heera', 'samantha', 'lekha', 'karen', 'moira', 'tessa', 'kathy', 'flo', 'shelley', 'grandma', 'google हिन्दी', 'woman'];

                const testKeywords = (keywords: string[]) =>
                    keywords.some(k => name.includes(k) || uri.includes(k));

                if (gender === 'male') {
                    return testKeywords(maleKeywords);
                } else {
                    if (testKeywords(femaleKeywords)) return true;
                    if (name.includes('google') && !name.includes('male')) return true;
                    return !testKeywords(maleKeywords);
                }
            };

            const langParts = lang.split('-');
            const primaryLang = langParts[0].toLowerCase();
            const exactLangVoices = voices.filter(v => v.lang.toLowerCase() === lang.toLowerCase());
            const primaryLangVoices = voices.filter(v => v.lang.toLowerCase().startsWith(primaryLang));

            const findVoice = (l: string, g: 'male' | 'female', exact: boolean = false) =>
                voices.find(v => {
                    const vLang = v.lang.toLowerCase();
                    const targetLang = l.toLowerCase();
                    const matchLang = exact ? vLang === targetLang : vLang.startsWith(targetLang.split('-')[0]);
                    return matchLang && isGenderMatch(v);
                });

            let preferredVoice: SpeechSynthesisVoice | null = findVoice(lang, gender, true) || null;

            // Fallbacks for India-specific accents
            if (!preferredVoice) {
                if (lang.toLowerCase() === "en-in" && gender === "female") {
                    preferredVoice = findVoice("hi-IN", "female", true) || null;
                } else if (lang.toLowerCase() === "hi-in" && gender === "male") {
                    preferredVoice = findVoice("en-IN", "male", true) || null;
                }
            }

            // General fallbacks
            if (!preferredVoice) {
                preferredVoice = findVoice(lang, gender) || // Primary lang + Gender
                    voices.find(v => (v.lang.toLowerCase().startsWith("en-in") || v.lang.toLowerCase().startsWith("en-us")) && isGenderMatch(v)) || // Common Gender
                    exactLangVoices[0] ||
                    primaryLangVoices[0] ||
                    voices.find(isGenderMatch) ||
                    voices[0] || null;
            }

            if (preferredVoice) {
                utterance.voice = preferredVoice;
                // Update utterance lang to match voice for better compatibility
                utterance.lang = preferredVoice.lang;

                // SPECIAL FIX: If we are using an English voice for Hindi text,
                // we must Romanize the text, otherwise it stays silent.
                const isEnglishVoice = preferredVoice.lang.toLowerCase().startsWith('en');
                const isHindiRequest = lang.toLowerCase().startsWith('hi');

                if (isEnglishVoice && isHindiRequest) {
                    // Simple transliteration for common hospital phrases
                    let romanizedText = text;
                    const map: Record<string, string> = {
                        "टोकन नंबर": "Token number",
                        "कृपया": "kripya",
                        "के लिए जाएं": "ke liye jaayein",
                        "आंख की जांच": "aankh ki jaanch",
                        "परामर्श": "paramarsh",
                        "परीक्षण": "parikshan",
                        "हिंदी": "Hindi",
                        "वॉयस": "voice",
                        "घोषणा": "ghoshna",
                        "का": "ka",
                        "।": ".",
                        ",": ",",
                    };

                    Object.entries(map).forEach(([hi, en]) => {
                        romanizedText = romanizedText.replace(new RegExp(hi, 'g'), en);
                    });

                    utterance.text = romanizedText;
                }
            }
        }

        // Fix for silent speech synthesis: cancel previous ones
        window.speechSynthesis.cancel();
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
