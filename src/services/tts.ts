import * as Speech from 'expo-speech';

let preferredVoice: string | undefined;

export async function prepareFrenchVoice() {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const french = voices.filter((voice) => voice.language.toLowerCase().startsWith('fr'));
    preferredVoice = (french.find((voice) => voice.quality === 'Enhanced') ?? french[0])?.identifier;
  } catch {
    preferredVoice = undefined;
  }
}

export function speakFrench(text: string, rate = 0.92) {
  Speech.stop();
  Speech.speak(text.replace(/[*#>`_]/g, ' ').replace(/\s+/g, ' ').trim(), {
    language: 'fr-FR', voice: preferredVoice, rate, pitch: 1,
  });
}

export function stopSpeaking() {
  Speech.stop();
}
