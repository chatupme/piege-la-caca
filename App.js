import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Accelerometer } from 'expo-sensors';
import {
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

const ALL_SOUNDS = [
  { label: 'Prout 1', category: 'prout', file: require('./assets/sounds/fart1.mp3') },
  { label: 'Prout 2', category: 'prout', file: require('./assets/sounds/fart2.mp3') },
  { label: 'Prout 3', category: 'prout', file: require('./assets/sounds/fart3.mp3') },
  { label: 'Prout 4', category: 'prout', file: require('./assets/sounds/fart4.mp3') },
  { label: 'Ronflement', category: 'ronflement', file: require('./assets/sounds/ronflement.mp3') },
  { label: 'Sirène 1', category: 'sirene', file: require('./assets/sounds/sirene1.mp3') },
  { label: 'Sirène 2', category: 'sirene', file: require('./assets/sounds/sirene2.mp3') },
  { label: 'Sirène 3', category: 'sirene', file: require('./assets/sounds/sirene3.mp3') },
  { label: 'Sirène 4', category: 'sirene', file: require('./assets/sounds/sirene4.mp3') },
  { label: 'Sirène 5', category: 'sirene', file: require('./assets/sounds/sirene5.mp3') },
  { label: 'Sirène 6', category: 'sirene', file: require('./assets/sounds/sirene6.mp3') },
  { label: 'Tondeuse', category: 'tondeuse', file: require('./assets/sounds/tondeuse.mp3') },
];

const CATEGORIES = [
  { key: 'prout', label: '💩 Prout' },
  { key: 'sirene', label: '🚔 Sirène' },
  { key: 'ronflement', label: '😴 Ronflement' },
  { key: 'tondeuse', label: '🌿 Tondeuse' },
  { key: 'perso', label: '🎙️ Personnalisé' },
];

const SHAKE_THRESHOLD = 1.8;

function formatDelay(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec === 0 ? `${min}min` : `${min}min${sec}s`;
}

// Lecteur dédié à l'enregistrement perso, piloté depuis le parent via ref
const CustomPlayer = React.forwardRef(({ uri }, ref) => {
  const player = useAudioPlayer(uri);
  useImperativeHandle(ref, () => ({
    play: () => {
      try {
        player.seekTo(0);
        player.play();
      } catch (e) {}
    },
    stop: () => {
      try {
        player.pause();
        player.seekTo(0);
      } catch (e) {}
    },
  }));
  return null;
});

export default function App() {
  const [selectedDelay, setSelectedDelay] = useState(10);
  const [openCategory, setOpenCategory] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState([0]);
  const [customSelected, setCustomSelected] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [showChaosPanel, setShowChaosPanel] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState({});
  const [customPreviewPlaying, setCustomPreviewPlaying] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);

  const [screenState, setScreenState] = useState('menu');
  const [countdown, setCountdown] = useState(null);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const lastShakeTime = useRef(0);
  const customPlayerRef = useRef(null);

  const player0 = useAudioPlayer(ALL_SOUNDS[0].file);
  const player1 = useAudioPlayer(ALL_SOUNDS[1].file);
  const player2 = useAudioPlayer(ALL_SOUNDS[2].file);
  const player3 = useAudioPlayer(ALL_SOUNDS[3].file);
  const player4 = useAudioPlayer(ALL_SOUNDS[4].file);
  const player5 = useAudioPlayer(ALL_SOUNDS[5].file);
  const player6 = useAudioPlayer(ALL_SOUNDS[6].file);
  const player7 = useAudioPlayer(ALL_SOUNDS[7].file);
  const player8 = useAudioPlayer(ALL_SOUNDS[8].file);
  const player9 = useAudioPlayer(ALL_SOUNDS[9].file);
  const player10 = useAudioPlayer(ALL_SOUNDS[10].file);
  const player11 = useAudioPlayer(ALL_SOUNDS[11].file);
  const players = [
    player0, player1, player2, player3, player4, player5,
    player6, player7, player8, player9, player10, player11,
  ];

  // Enregistrement micro
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const anySoundPlaying =
    Object.values(previewPlaying).some((v) => v) || customPreviewPlaying;

  const stopAllSounds = () => {
    players.forEach((p) => {
      try {
        p.pause();
        p.seekTo(0);
      } catch (e) {}
    });
    setPreviewPlaying({});
    if (customPlayerRef.current) {
      customPlayerRef.current.stop();
    }
    setCustomPreviewPlaying(false);
  };

  // Le son doit se déclencher même si l'appareil est en mode silencieux
  // (bouton physique sur iPhone/iPad), sinon le piège ne sert à rien.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      interruptionMode: 'mixWithOthers',
    }).catch((e) => console.warn('setAudioModeAsync failed:', e));
  }, []);

  useEffect(() => {
    const subscription = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime.current > 1000) {
          lastShakeTime.current = now;
          if (screenState === 'menu') {
            if (anySoundPlaying) {
              stopAllSounds();
            } else {
              triggerCountdown();
            }
          } else if (screenState === 'finished') {
            stopAllSounds();
          }
        }
      }
    });

    Accelerometer.setUpdateInterval(200);

    return () => subscription.remove();
  }, [screenState, selectedDelay, selectedIndices, customSelected, anySoundPlaying]);

  const toggleCategory = (key) => {
    setOpenCategory(openCategory === key ? null : key);
  };

  const toggleChaosPanel = () => {
    setShowChaosPanel((prev) => !prev);
  };

  const toggleChaosMode = () => {
    const next = !chaosMode;
    setChaosMode(next);
    if (!next) {
      if (selectedIndices.length > 0) {
        setSelectedIndices([selectedIndices[0]]);
        setCustomSelected(false);
      } else if (customSelected) {
        setSelectedIndices([]);
      }
    }
  };

  const selectSound = (index) => {
    if (chaosMode) {
      setSelectedIndices((prev) =>
        prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedIndices([index]);
      setCustomSelected(false);
    }
  };

  const selectCustom = () => {
    if (!recordingUri) return;
    if (chaosMode) {
      setCustomSelected((prev) => !prev);
    } else {
      setCustomSelected(true);
      setSelectedIndices([]);
    }
  };

  const togglePreview = (index) => {
    const isPlaying = !!previewPlaying[index];
    try {
      if (isPlaying) {
        players[index].pause();
        players[index].seekTo(0);
        setPreviewPlaying((prev) => ({ ...prev, [index]: false }));
      } else {
        players[index].seekTo(0);
        players[index].play();
        setPreviewPlaying((prev) => ({ ...prev, [index]: true }));
      }
    } catch (e) {}
  };

  const toggleCustomPreview = () => {
    if (!recordingUri || !customPlayerRef.current) return;
    if (customPreviewPlaying) {
      customPlayerRef.current.stop();
      setCustomPreviewPlaying(false);
    } else {
      customPlayerRef.current.play();
      setCustomPreviewPlaying(true);
    }
  };

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Micro refusé',
        "Active l'autorisation micro dans les réglages du téléphone pour enregistrer un son."
      );
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert('Erreur', "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      if (recorder.uri) {
        setRecordingUri(recorder.uri);
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'arrêter l'enregistrement.");
    }
  };

  const triggerCountdown = () => {
    if (selectedIndices.length === 0 && !customSelected) {
      Alert.alert('Oups', 'Choisis au moins un son avant de déclencher.');
      return;
    }
    stopAllSounds();
    setScreenState('countdown');
    setCountdown(selectedDelay);

    let remaining = selectedDelay;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    timerRef.current = setTimeout(() => {
      playSelectedSounds();
      setScreenState('finished');
      setCountdown(null);
    }, selectedDelay * 1000);
  };

  const handleBlackScreenTap = () => {
    if (screenState === 'countdown') {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    }
    stopAllSounds();
    setScreenState('menu');
    setCountdown(null);
  };

  const playSelectedSounds = () => {
    try {
      stopAllSounds();
      selectedIndices.forEach((index) => {
        players[index].seekTo(0);
        players[index].play();
      });
      if (customSelected && customPlayerRef.current) {
        customPlayerRef.current.play();
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de jouer le son.');
    }
  };

  if (screenState === 'countdown' || screenState === 'finished') {
    return (
      <>
        {recordingUri && <CustomPlayer ref={customPlayerRef} uri={recordingUri} />}
        <TouchableOpacity
          style={styles.blackScreen}
          activeOpacity={1}
          onPress={handleBlackScreenTap}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {recordingUri && <CustomPlayer ref={customPlayerRef} uri={recordingUri} />}

      <View style={styles.header}>
        <Image source={require('./assets/favicon.png')} style={styles.logo} />
        <TouchableOpacity onPress={toggleChaosPanel} activeOpacity={0.6}>
          <Text style={styles.title}>
            <Text>😆</Text> PrankMe?!
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {showChaosPanel && (
          <TouchableOpacity style={styles.chaosRowSmall} onPress={toggleChaosMode}>
            <View style={[styles.checkboxSmall, chaosMode && styles.checkboxChecked]}>
              {chaosMode && <Text style={styles.checkboxMarkSmall}>✓</Text>}
            </View>
            <Text style={styles.chaosTextSmall}>
              Mode chaos — sélectionne plusieurs sons pour le déclenchement final
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.subtitle}>Choisis une catégorie</Text>
        {CATEGORIES.map((cat) => {
          const isOpen = openCategory === cat.key;

          if (cat.key === 'perso') {
            return (
              <View key={cat.key} style={styles.categoryBlock}>
                <TouchableOpacity
                  style={[styles.categoryHeader, isOpen && styles.categoryHeaderOpen]}
                  onPress={() => toggleCategory(cat.key)}
                >
                  <Text style={styles.categoryHeaderText}>{cat.label}</Text>
                  <Text style={styles.categoryArrow}>{isOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.soundsWrap}>
                    <TouchableOpacity
                      style={[
                        styles.recordButton,
                        recorderState.isRecording && styles.recordButtonActive,
                      ]}
                      onPress={recorderState.isRecording ? stopRecording : startRecording}
                    >
                      <Text style={styles.recordButtonText}>
                        {recorderState.isRecording ? '⏹️ Arrêter l\'enregistrement' : '🎙️ Enregistrer un son'}
                      </Text>
                    </TouchableOpacity>

                    {recordingUri && (
                      <View
                        style={[
                          styles.soundButton,
                          customSelected && styles.soundButtonSelected,
                          { marginTop: 10 },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.soundLabelZone}
                          onPress={selectCustom}
                        >
                          <Text
                            style={[
                              styles.soundText,
                              customSelected && styles.soundTextSelected,
                            ]}
                          >
                            Mon enregistrement
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.previewIcon}
                          onPress={toggleCustomPreview}
                        >
                          <Text style={styles.previewIconText}>
                            {customPreviewPlaying ? '⏹️' : '🔊'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }

          const soundsInCat = ALL_SOUNDS
            .map((s, index) => ({ ...s, index }))
            .filter((s) => s.category === cat.key);

          return (
            <View key={cat.key} style={styles.categoryBlock}>
              <TouchableOpacity
                style={[styles.categoryHeader, isOpen && styles.categoryHeaderOpen]}
                onPress={() => toggleCategory(cat.key)}
              >
                <Text style={styles.categoryHeaderText}>{cat.label}</Text>
                <Text style={styles.categoryArrow}>{isOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.soundsWrap}>
                  {soundsInCat.map((s) => {
                    const isSelected = selectedIndices.includes(s.index);
                    const isPreviewing = !!previewPlaying[s.index];
                    return (
                      <View
                        key={s.index}
                        style={[
                          styles.soundButton,
                          isSelected && styles.soundButtonSelected,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.soundLabelZone}
                          onPress={() => selectSound(s.index)}
                        >
                          <Text
                            style={[
                              styles.soundText,
                              isSelected && styles.soundTextSelected,
                            ]}
                          >
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.previewIcon}
                          onPress={() => togglePreview(s.index)}
                        >
                          <Text style={styles.previewIconText}>
                            {isPreviewing ? '⏹️' : '🔊'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.subtitle}>Choisis le délai</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.delayButton, selectedDelay === 5 && styles.delayButtonSelected]}
            onPress={() => setSelectedDelay(5)}
          >
            <Text style={[styles.delayText, selectedDelay === 5 && styles.delayTextSelected]}>
              5s
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.delayButton, selectedDelay === 10 && styles.delayButtonSelected]}
            onPress={() => setSelectedDelay(10)}
          >
            <Text style={[styles.delayText, selectedDelay === 10 && styles.delayTextSelected]}>
              10s
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sliderBlock}>
          <Text style={styles.sliderLabel}>
            Ou choisis un délai perso : {formatDelay(selectedDelay)}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={15}
            maximumValue={180}
            step={5}
            value={selectedDelay >= 15 ? selectedDelay : 15}
            onValueChange={(value) => setSelectedDelay(value)}
            minimumTrackTintColor="#FF9800"
            maximumTrackTintColor="#5C3A99"
            thumbTintColor="#FFD54F"
          />
          <View style={styles.sliderRange}>
            <Text style={styles.sliderRangeText}>15s</Text>
            <Text style={styles.sliderRangeText}>3min</Text>
          </View>
        </View>

        {anySoundPlaying ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopAllSounds}>
            <Text style={styles.armButtonText}>STOP</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.armButton} onPress={triggerCountdown}>
            <Text style={styles.armButtonText}>DÉCLENCHER</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          Ou secoue ton téléphone pour déclencher directement 🤳
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3E1F6B' },
  header: { alignItems: 'center', paddingTop: 34, paddingBottom: 10 },
  logo: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFD54F' },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 60 },
  chaosRowSmall: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A2E7A',
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12,
    width: '100%', opacity: 0.85,
  },
  checkboxSmall: {
    width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: '#AAAAAA',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  checkboxChecked: { backgroundColor: '#8BC34A', borderColor: '#8BC34A' },
  checkboxMarkSmall: { color: '#2E1A47', fontWeight: 'bold', fontSize: 10 },
  chaosTextSmall: { color: '#CCCCCC', fontSize: 11, flexShrink: 1 },
  subtitle: { fontSize: 18, color: '#FFFFFF', marginBottom: 8, marginTop: 6, alignSelf: 'flex-start' },
  categoryBlock: { width: '100%', marginBottom: 10 },
  categoryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#5C3A99', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
  },
  categoryHeaderOpen: {
    backgroundColor: '#E91E63', borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  categoryHeaderText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  categoryArrow: { color: '#FFFFFF', fontSize: 14 },
  soundsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#2E1A47',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 10,
  },
  soundButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#5C3A99',
    borderRadius: 12, margin: 4, paddingLeft: 14, paddingRight: 6, paddingVertical: 8,
  },
  soundButtonSelected: { backgroundColor: '#FF9800' },
  soundLabelZone: { paddingVertical: 4 },
  soundText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  soundTextSelected: { color: '#2E1A47' },
  previewIcon: { marginLeft: 10, paddingHorizontal: 8, paddingVertical: 4 },
  previewIconText: { fontSize: 16 },
  recordButton: {
    backgroundColor: '#E91E63', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 16, width: '100%', alignItems: 'center',
  },
  recordButtonActive: { backgroundColor: '#FF5252' },
  recordButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 10 },
  delayButton: { backgroundColor: '#5C3A99', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, margin: 5 },
  delayButtonSelected: { backgroundColor: '#8BC34A' },
  delayText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  delayTextSelected: { color: '#2E1A47' },
  sliderBlock: { width: '100%', marginBottom: 15, marginTop: 5 },
  sliderLabel: { color: '#FFFFFF', fontSize: 14, marginBottom: 4, textAlign: 'center' },
  slider: { width: '100%', height: 40 },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  sliderRangeText: { color: '#CCCCCC', fontSize: 12 },
  armButton: {
    backgroundColor: '#FF9800', paddingVertical: 18, paddingHorizontal: 50,
    borderRadius: 30, marginTop: 10,
  },
  stopButton: {
    backgroundColor: '#D32F2F', paddingVertical: 18, paddingHorizontal: 50,
    borderRadius: 30, marginTop: 10,
  },
  armButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  hint: { color: '#CCCCCC', marginTop: 20, fontSize: 14, textAlign: 'center' },
  blackScreen: { flex: 1, backgroundColor: '#000000' },
});