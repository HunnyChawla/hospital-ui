import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceRecordingOptions {
  onTranscript?: (text: string) => void;
  continuous?: boolean;
  language?: string;
}

export const useVoiceRecording = ({
  onTranscript,
  continuous = true,
  language = "en-US",
}: UseVoiceRecordingOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = language;

        recognitionRef.current.onresult = (event: any) => {
          let interimText = "";
          let finalText = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + " ";
            } else {
              interimText += transcript;
            }
          }

          if (finalText) {
            setTranscript((prev) => prev + finalText);
            if (onTranscript) {
              onTranscript(finalText.trim());
            }
          }
          setInterimTranscript(interimText);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setError(event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setIsSupported(false);
        setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [continuous, language, onTranscript]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current && !isRecording) {
      try {
        setError(null);
        setTranscript("");
        setInterimTranscript("");
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err: any) {
        console.error("Error starting recognition:", err);
        setError(err.message);
      }
    }
  }, [isSupported, isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  };
};
