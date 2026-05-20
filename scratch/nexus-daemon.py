"""
NEXUS Background Tray Daemon - "Hey Jarvis" System-wide Wake Word Monitor
--------------------------------------------------------------------------
This script runs in your OS background even when your browser tab is closed.
When it hears you say "Jarvis" or "Hey Jarvis", it:
  1. Speaks a greeting verbally ("Yes, Namir. I'm here.")
  2. Automatically pops open your browser to the local cockpit: http://localhost:3001

To run this background daemon:
  1. Install python dependencies:
     pip install SpeechRecognition pyttsx3 pyaudio
  2. Start the daemon:
     python nexus-daemon.py
"""

import time
import webbrowser
import sys

# Try imports, print helpful instructions if missing
try:
    import speech_recognition as sr
except ImportError:
    print("Error: 'SpeechRecognition' package not found.")
    print("Please run: pip install SpeechRecognition")
    sys.exit(1)

try:
    import pyttsx3
    HAS_TTS = True
except ImportError:
    HAS_TTS = False
    print("Note: 'pyttsx3' not found. Voice greetings will fallback to system beeps.")
    print("To enable verbal greetings, run: pip install pyttsx3")

# Initialize TTS Engine
engine = None
if HAS_TTS:
    try:
        engine = pyttsx3.init()
        # Make the voice slightly faster and more premium
        engine.setProperty('rate', 180)
        # Select voice (usually index 1 is female/softer, 0 is male)
        voices = engine.getProperty('voices')
        if len(voices) > 1:
            engine.setProperty('voice', voices[1].id)
    except Exception as e:
        print(f"Failed to initialize pyttsx3: {e}. Falling back to default.")
        engine = None

def speak(text):
    print(f"[Orion]: {text}")
    if engine:
        try:
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            print(f"TTS Speech error: {e}")
    else:
        # Fallback to system beep
        if sys.platform == "win32":
            import winsound
            winsound.Beep(880, 200)
            winsound.Beep(1200, 300)

def trigger_activation():
    speak("Yes, Namir. I'm opening the control cockpit.")
    # Launch browser to our unified Express production/development port
    webbrowser.open("http://localhost:3001")

def main():
    recognizer = sr.Recognizer()
    # Adjust sensitivity thresholds
    recognizer.dynamic_energy_threshold = True
    recognizer.energy_threshold = 1000 
    
    print("==========================================================")
    print("      ORION COGNITIVE SYSTEM - BACKGROUND DAEMON")
    print("==========================================================")
    print("Status: Monitoring microphone in background...")
    print("Wake Phrase: 'Orion' / 'Jarvis'")
    print("Press Ctrl+C to terminate this background monitor.")
    print("==========================================================")
    
    # Try accessing mic
    try:
        microphone = sr.Microphone()
    except Exception as e:
        print(f"\n[Error] Unable to access system microphone: {e}")
        print("Please check that a microphone is plugged in and allowed in privacy settings.")
        sys.exit(1)

    with microphone as source:
        # Calibrate ambient noise
        print("Calibrating background noise level (1 second)...")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        print("Calibration completed. Ready and listening...")

    while True:
        try:
            with microphone as source:
                # Listen with a timeout to avoid hanging indefinitely if there is silence
                audio = recognizer.listen(source, timeout=5, phrase_time_limit=3)
            
            try:
                # Transcribe speech using Google Web Speech Recognition (free, fast API)
                print("Processing speech input...")
                text = recognizer.recognize_google(audio).lower()
                print(f"Heard: '{text}'")
                
                if (
                    "jarvis" in text or
                    "orion" in text or
                    "hey jarvis" in text or
                    "hey orion" in text
                ):
                    trigger_activation()
                    # Sleep briefly to avoid immediately double-triggering
                    time.sleep(5)
            except sr.UnknownValueError:
                # Speech was unintelligible
                pass
            except sr.RequestError as e:
                print(f"Speech service network error: {e}")
                time.sleep(2)
        except sr.WaitTimeoutError:
            # Silence timeout, check if still running and loop
            pass
        except KeyboardInterrupt:
            print("\nShutting down background daemon. Goodbye.")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
