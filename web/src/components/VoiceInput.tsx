import React, { useState, useRef } from "react";

type Props = {
  onResult: (text: string) => void;
};

export const VoiceInput: React.FC<Props> = ({ onResult }) => {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  // Start Arabic voice recognition
  const startListening = () => {
    setError(null);
    if (!isSupported) return setError("متصفحك لا يدعم التعرف الصوتي.");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onerror = (evt: any) => {
      setListening(false);
      setError("حدث خطأ أثناء التعرف الصوتي.");
    };
    recognition.onresult = (event: any) => {
      setListening(false);
      if (event.results?.length > 0) {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      }
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", marginLeft: 8 }}>
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={!isSupported}
        title="إدخال صوتي (عربي)"
        style={{
          background: listening ? "#F44336" : "#4285F4",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isSupported ? "pointer" : "not-allowed",
          position: "relative",
        }}
      >
        <span style={{ fontSize: "1.4em" }}>
          {listening ? "🎙️" : "🎤"}
        </span>
        {listening && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              fontSize: "0.7em",
              background: "#fff",
              color: "#F44336",
              borderRadius: "4px",
              padding: "0 2px",
            }}
          >
            يستمع...
          </span>
        )}
      </button>
      {error && (
        <span style={{ color: "red", marginRight: 8, fontSize: "0.95em" }}>
          {error}
        </span>
      )}
    </div>
  );
};