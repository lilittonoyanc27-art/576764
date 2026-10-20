/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Languages,
  RotateCw,
  Trophy,
  Award,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ListOrdered,
  Eye,
  KeyRound,
  RefreshCw,
  X,
  Play
} from 'lucide-react';
import {
  SITUATION_QUESTIONS,
  TARGET_WORD,
  TARGET_WORD_TRANSLATION_HY,
  TARGET_WORD_DEFINITION_HY,
  TARGET_WORD_DEFINITION_ES,
  SituationQuestion
} from './questions';
import { sound } from './sound';

// Spanish Alphabet for letter selection
const SPANISH_ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

// Wheel sectors definition - all positive and rewarding, NO bankrupt/0!
interface WheelSector {
  label: string;
  subLabel?: string;
  value: number;
  type: 'points' | 'bonus_letter' | 'double' | 'prize';
  color: string;
  textColor: string;
}

const WHEEL_SECTORS: WheelSector[] = [
  { label: '500', value: 500, type: 'points', color: '#f59e0b', textColor: '#000000' },
  { label: '100', value: 100, type: 'points', color: '#10b981', textColor: '#ffffff' },
  { label: '+', subLabel: 'ՏԱՌ', value: 0, type: 'bonus_letter', color: '#3b82f6', textColor: '#ffffff' },
  { label: '300', value: 300, type: 'points', color: '#8b5cf6', textColor: '#ffffff' },
  { label: 'x2', subLabel: 'ԿՐԿՆԱԿԻ', value: 0, type: 'double', color: '#ec4899', textColor: '#ffffff' },
  { label: '200', value: 200, type: 'points', color: '#06b6d4', textColor: '#ffffff' },
  { label: 'ПРИЗ', subLabel: 'ՄՐՑԱՆԱԿ', value: 750, type: 'prize', color: '#eab308', textColor: '#000000' },
  { label: '400', value: 400, type: 'points', color: '#6366f1', textColor: '#ffffff' },
  { label: '600', value: 600, type: 'points', color: '#0ea5e9', textColor: '#ffffff' },
  { label: '1000', value: 1000, type: 'points', color: '#f43f5e', textColor: '#ffffff' },
];

export default function App() {
  // Game Word state
  const targetChars = TARGET_WORD.split('');
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [lettersToPick, setLettersToPick] = useState<number>(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const alphabetRef = useRef<HTMLDivElement | null>(null);

  // Quiz progression state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const currentQ: SituationQuestion = SITUATION_QUESTIONS[currentQuestionIndex] || SITUATION_QUESTIONS[0];
  
  // User answers tracking
  const [userAnswers, setUserAnswers] = useState<Record<number, {
    selected: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
  }>>({});

  // Armenian translations toggle per question elements
  const [revealedTranslations, setRevealedTranslations] = useState<Record<string, boolean>>({});
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(false);

  // Score & streaks
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [currentStakePoints, setCurrentStakePoints] = useState<number>(300);

  // Wheel state
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [wheelResultMsg, setWheelResultMsg] = useState<string | null>(null);

  // Modals & Panels
  const [showWordGuessModal, setShowWordGuessModal] = useState<boolean>(false);
  const [wordGuessInput, setWordGuessInput] = useState<string>('');
  const [guessError, setGuessError] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showQuestionBrowser, setShowQuestionBrowser] = useState<boolean>(false);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'large' | 'xlarge'>('large');

  // Feedback banner after answering
  const [feedbackState, setFeedbackState] = useState<{
    show: boolean;
    isCorrect: boolean;
    messageHy: string;
    messageEs: string;
  } | null>(null);

  // Unique alphabet letters in target word
  const uniqueLetters = Array.from(new Set(targetChars));

  // Audio sound toggle sync
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Check victory condition
  useEffect(() => {
    if (revealedIndices.length === targetChars.length && targetChars.length > 0 && !isGameWon) {
      setIsGameWon(true);
      sound.playWinFanfare();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }, [revealedIndices, targetChars.length, isGameWon]);

  // Toggle translation for a specific item id (e.g. 'scenario-2', 'option-2-A', etc.)
  const toggleItemTranslation = (key: string) => {
    setRevealedTranslations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isItemTranslated = (key: string) => {
    return showAllTranslations || !!revealedTranslations[key];
  };

  // Spin the drum / wheel
  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelResultMsg(null);

    const sectorAngle = 360 / WHEEL_SECTORS.length;
    // Spin between 4 to 7 full rotations plus a random sector
    const extraRotations = 360 * (4 + Math.floor(Math.random() * 3));
    const randomSectorIdx = Math.floor(Math.random() * WHEEL_SECTORS.length);
    // Add offset so pointer (at 0 degrees / top) lands within the sector center
    const targetAngle = wheelRotation + extraRotations + (randomSectorIdx * sectorAngle) + (sectorAngle / 2);

    // Audio clicks during spin
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      sound.playTick();
      tickCount++;
      if (tickCount > 25) {
        clearInterval(tickInterval);
      }
    }, 120);

    setWheelRotation(targetAngle);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      sound.playWheelStop();

      // Normalize angle to find landed sector at top (pointer at 270 deg or top 90 deg)
      // Since SVG rotates clockwise, the sector under the top pointer corresponds to:
      const normalizedAngle = (360 - (targetAngle % 360)) % 360;
      const landedIdx = Math.floor(normalizedAngle / sectorAngle) % WHEEL_SECTORS.length;
      const sector = WHEEL_SECTORS[landedIdx];

      handleSectorLanded(sector);
    }, 3200);
  };

  // Process wheel landing
  // Process wheel landing
  const handleSectorLanded = (sector: WheelSector) => {
    if (sector.type === 'points') {
      setCurrentStakePoints(sector.value);
      setWheelResultMsg(`🎯 Բաժին: ${sector.label} միավոր! Պատասխանիր հարցին՝ միավորները ստանալու և տառ ընտրելու համար:`);
    } else if (sector.type === 'bonus_letter') {
      setLettersToPick(prev => prev + 1);
      sound.playCorrect();
      setWheelResultMsg('⭐ ԲԱԺԻՆ «+»! Դուք շահեցիք ԱՆՎՃԱՐ ՏԱՌ: Այժմ ինքդ այբուբենից ընտրիր տառը:');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      setTimeout(() => {
        alphabetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    } else if (sector.type === 'double') {
      setCurrentStakePoints(prev => Math.max(prev * 2, 600));
      setWheelResultMsg('🔥 ԲԱԺԻՆ «x2»! Հաջորդ ճիշտ պատասխանի միավորները կրկնապատկվում են:');
    } else if (sector.type === 'prize') {
      setLettersToPick(prev => prev + 2);
      setScore(prev => prev + 750);
      sound.playCorrect();
      setWheelResultMsg('🎁 ԲԱԺԻՆ «ПРИЗ»! +750 միավոր և 2 տառ այբուբենից ընտրելու հնարավորություն!');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      setTimeout(() => {
        alphabetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  };

  // User selects an option in the current question
  const handleSelectOption = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const isAlreadyAnswered = !!userAnswers[currentQ.id];
    if (isAlreadyAnswered) return;

    const isCorrect = optionKey === currentQ.correctAnswer;

    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: { selected: optionKey, isCorrect }
    }));

    if (isCorrect) {
      sound.playCorrect();
      const pointsWon = currentStakePoints || 300;
      setScore(prev => prev + pointsWon);
      setStreak(prev => prev + 1);
      // Award right to open letter from alphabet!
      setLettersToPick(prev => prev + 1);
      setFeedbackState({
        show: true,
        isCorrect: true,
        messageHy: `🎉 ՇՆՈՐՀԱՎՈՐՈՒՄ ԵՆՔ! Ճիշտ պատասխան (+${pointsWon} մ.): Այժմ ինքդ այբուբենից (A–Z) ընտրիր տառը!`,
        messageEs: '¡Excelente! Respuesta correcta. Ahora elige tú mismo una letra del alfabeto (A–Z) para abrirla en el panel.'
      });
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      setTimeout(() => {
        alphabetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    } else {
      // User requested: "если ответ неверный всё равно продолжить игру"
      sound.playWrong();
      setStreak(0);
      setFeedbackState({
        show: true,
        isCorrect: false,
        messageHy: `⚠️ Ընտրված պատասխանը սխալ էր, բայց խաղը շարունակվում է! Ճիշտ տարբերակն էր՝ ${currentQ.correctAnswer}։ Կարդացեք բացատրությունը և շարունակեք:`,
        messageEs: `Opción no recomendada, pero ¡el juego continúa! La respuesta adecuada era la ${currentQ.correctAnswer}.`
      });
    }
  };

  // Direct click on a specific tile slot on the "Поле чудес" board
  const handleSlotClick = (index: number) => {
    if (revealedIndices.includes(index)) {
      sound.playFlip();
      return;
    }

    sound.playTick();
    setFeedbackState({
      show: true,
      isCorrect: lettersToPick > 0,
      messageHy: lettersToPick > 0
        ? `👇 Տառ բացելու համար ինքներդ ընտրեք այն ստորև բերված այբուբենից (A–Z)!`
        : `ℹ️ Տառ ընտրելու համար ճիշտ պատասխանիր հարցին կամ պտտիր թմբուկը!`,
      messageEs: lettersToPick > 0
        ? 'Elige una letra en el teclado del alfabeto de abajo (A–Z).'
        : 'Responde correctamente a una pregunta o gira la ruleta para ganar turnos de letra.'
    });
    alphabetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Reveal letter by picking from the FULL Spanish alphabet (A–Z)
  const handleAlphabetLetterClick = (char: string) => {
    if (guessedLetters.includes(char)) {
      sound.playTick();
      setFeedbackState({
        show: true,
        isCorrect: true,
        messageHy: `ℹ️ «${char}» տառն արդեն ընտրել եք: Ընտրեք այլ տառ այբուբենից:`,
        messageEs: `Ya has probado la letra '${char}'. Por favor, elige otra.`
      });
      return;
    }

    if (lettersToPick <= 0) {
      sound.playTick();
      setFeedbackState({
        show: true,
        isCorrect: false,
        messageHy: `ℹ️ Տառ ընտրելու համար նախ ճիշտ պատասխանիր հարցին կամ պտտիր թմբուկը (+ բաժին)!`,
        messageEs: 'Para elegir una letra, responde correctamente a una situación o gira la ruleta hacia "+".'
      });
      return;
    }

    // Register this letter as guessed
    setGuessedLetters(prev => [...prev, char]);

    // Check if letter exists in TARGET_WORD
    const matchingIndices: number[] = [];
    targetChars.forEach((c, idx) => {
      if (c === char) {
        matchingIndices.push(idx);
      }
    });

    if (matchingIndices.length > 0) {
      // Letter is in the word!
      sound.playCorrect();
      sound.playFlip();
      setRevealedIndices(prev => Array.from(new Set([...prev, ...matchingIndices])));
      setLettersToPick(prev => Math.max(0, prev - 1));
      const pointsWon = matchingIndices.length * 200;
      setScore(prev => prev + pointsWon);
      setFeedbackState({
        show: true,
        isCorrect: true,
        messageHy: `🎉 ՃԻՇՏ Է! «${char}» տառը կա բառում (${matchingIndices.length} հատ): Տառերը բացվեցին (+${pointsWon} մ.)!`,
        messageEs: `¡Correcto! La letra '${char}' está en la palabra (${matchingIndices.length} veces).`
      });
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.4 }
      });
    } else {
      // Letter is NOT in TARGET_WORD
      sound.playWrong();
      setLettersToPick(prev => Math.max(0, prev - 1));
      setFeedbackState({
        show: true,
        isCorrect: false,
        messageHy: `⚠️ «${char}» տառը չկա «APROXIMADAMENTE» բառում: Բայց ոչինչ, խաղը շարունակվում է!`,
        messageEs: `La letra '${char}' no está en la palabra, ¡pero el juego continúa!`
      });
    }
  };

  // Next / Previous Question
  const goToNextQuestion = () => {
    setFeedbackState(null);
    if (currentQuestionIndex < SITUATION_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCurrentQuestionIndex(0);
    }
  };

  const goToPrevQuestion = () => {
    setFeedbackState(null);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setCurrentQuestionIndex(SITUATION_QUESTIONS.length - 1);
    }
  };

  // Full Word Guess attempt ("Назвать слово целиком")
  const handleFullWordGuess = (e: React.FormEvent) => {
    e.preventDefault();
    setGuessError(null);
    const cleaned = wordGuessInput.trim().toUpperCase();

    if (cleaned === TARGET_WORD) {
      // Win!
      const allIndices = targetChars.map((_, i) => i);
      setRevealedIndices(allIndices);
      setScore(prev => prev + 3000);
      setShowWordGuessModal(false);
      setIsGameWon(true);
      sound.playWinFanfare();
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    } else {
      sound.playWrong();
      setGuessError('Սխալ բառ է: Բայց խաղը չի ընդհատվում, կարող եք շարունակել հարցերը և բացել տառերը:');
    }
  };

  // Reset Game
  const handleRestart = () => {
    setRevealedIndices([]);
    setLettersToPick(0);
    setGuessedLetters([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setScore(0);
    setStreak(0);
    setIsGameWon(false);
    setFeedbackState(null);
  };

  const answeredCurrent = userAnswers[currentQ.id];
  const totalAnswered = Object.keys(userAnswers).length;
  const correctCount = Object.values(userAnswers).filter(a => a.isCorrect).length;

  // Font size responsive classes
  const fontScenarioClass =
    fontSizeScale === 'xlarge'
      ? 'text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed'
      : fontSizeScale === 'large'
      ? 'text-base sm:text-lg md:text-xl font-medium leading-relaxed'
      : 'text-sm sm:text-base md:text-lg font-medium leading-relaxed';

  const fontScenarioHyClass =
    fontSizeScale === 'xlarge'
      ? 'text-base sm:text-lg md:text-xl leading-relaxed'
      : fontSizeScale === 'large'
      ? 'text-sm sm:text-base md:text-lg leading-relaxed'
      : 'text-xs sm:text-sm md:text-base leading-relaxed';

  const fontOptionClass =
    fontSizeScale === 'xlarge'
      ? 'text-base sm:text-lg md:text-xl font-semibold'
      : fontSizeScale === 'large'
      ? 'text-sm sm:text-base md:text-lg font-medium'
      : 'text-xs sm:text-sm md:text-base font-medium';

  const fontOptionHyClass =
    fontSizeScale === 'xlarge'
      ? 'text-sm sm:text-base md:text-lg font-medium'
      : fontSizeScale === 'large'
      ? 'text-xs sm:text-sm md:text-base font-normal'
      : 'text-xs sm:text-sm font-normal';

  const fontTitleClass =
    fontSizeScale === 'xlarge'
      ? 'text-xl sm:text-2xl md:text-3xl font-black'
      : fontSizeScale === 'large'
      ? 'text-lg sm:text-xl md:text-2xl font-extrabold'
      : 'text-base sm:text-lg md:text-xl font-bold';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-widest font-extrabold text-amber-400">
                  Խաղ · Ուսուցում · Juego
                </span>
                <span className="bg-amber-500/10 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Nivel A2–B1
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Հրաշքների Դաշտ</span>
                <span className="text-amber-400 text-xs sm:text-sm font-normal">· Pole Chudes</span>
              </h1>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Միավոր</div>
                <div className="text-sm font-black text-amber-400">{score}</div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Տառեր</div>
                <div className="text-sm font-black text-emerald-400">
                  {revealedIndices.length} / {targetChars.length}
                </div>
              </div>
            </div>

            {/* Unlockable Letters Counter */}
            {lettersToPick > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-lg shadow-amber-500/30 animate-bounce flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>Բացիր {lettersToPick} տառ!</span>
              </div>
            )}
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-2">
            {/* Font Size Adjuster A / A+ / A++ */}
            <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-xl p-1 text-xs" title="Փոխել տառաչափը / Cambiar tamaño de letra">
              <span className="text-[10px] font-bold text-slate-400 px-1 hidden md:inline">Տառաչափ:</span>
              <button
                onClick={() => setFontSizeScale('normal')}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition ${
                  fontSizeScale === 'normal'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Սովորական տառաչափ"
              >
                A
              </button>
              <button
                onClick={() => setFontSizeScale('large')}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition ${
                  fontSizeScale === 'large'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Մեծ տառաչափ"
              >
                A+
              </button>
              <button
                onClick={() => setFontSizeScale('xlarge')}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition ${
                  fontSizeScale === 'xlarge'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Առավելագույն խոշոր տառաչափ"
              >
                A++
              </button>
            </div>

            {/* Global Translation Toggle */}
            <button
              onClick={() => setShowAllTranslations(!showAllTranslations)}
              title="Միացնել/անջատել հայերեն թարգմանությունը բոլոր տեղերում"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                showAllTranslations
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">
                {showAllTranslations ? 'Հայերենը միշտ բաց' : 'Հայերեն սեղմումով'}
              </span>
            </button>

            {/* Questions List Drawer */}
            <button
              onClick={() => setShowQuestionBrowser(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              title="30 հարցերի ցանկ"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              title={soundEnabled ? 'Անջատել ձայնը' : 'Միացնել ձայնը'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>

            {/* Rules */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
              title="Խաղի կանոնները"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 w-full flex-1 flex flex-col gap-6">

        {/* ========================================================
            SECTION 1: THE POLE CHUDES SCOREBOARD (Табло)
            ======================================================== */}
        <section className="bg-gradient-to-b from-slate-900 to-indigo-950/80 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          {/* Subtle studio glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Board Header & Word Definition Clue */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span className="text-sm font-black uppercase tracking-wider text-amber-400">
                  ՀԻՄՆԱԿԱՆ ԲԱՌԸ · PALABRA PRINCIPAL (15 տառ)
                </span>
              </div>
              <div
                onClick={() => toggleItemTranslation('word_clue')}
                className="mt-1.5 cursor-pointer group flex items-center gap-2"
                title="Սեղմեք հայերեն թարգմանությունը տեսնելու համար"
              >
                <p className="text-base sm:text-lg text-slate-200 group-hover:text-amber-300 transition leading-snug">
                  <span className="font-bold text-amber-400">🇪🇸 Հուշում: </span>
                  {TARGET_WORD_DEFINITION_ES}
                </p>
                <span className="text-xs bg-slate-800 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 group-hover:border-amber-400/50 shrink-0 font-semibold">
                  <Languages className="w-3.5 h-3.5" />
                  {isItemTranslated('word_clue') ? 'Թաքցնել' : 'Թարգմանել'}
                </span>
              </div>
              {isItemTranslated('word_clue') && (
                <p className="mt-2 text-sm sm:text-base text-amber-200 bg-amber-950/50 p-2.5 rounded-xl border border-amber-800/50 leading-relaxed">
                  🇦🇲 <span className="font-bold">{TARGET_WORD_DEFINITION_HY}</span>
                </p>
              )}
            </div>

            {/* Action Buttons: Guess Whole Word */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setShowWordGuessModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm sm:text-base rounded-xl shadow-lg shadow-amber-500/25 transition transform active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ասել ամբողջ բառը</span>
              </button>
            </div>
          </div>

          {/* Letter Picking Active Prompt */}
          {lettersToPick > 0 && (
            <div className="my-3.5 p-3.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/70 rounded-xl flex items-center justify-between gap-3 animate-pulse-glow">
              <div className="flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <span className="text-base font-black text-amber-200">
                    Ճիշտ է! Քո հերթն է:
                  </span>
                  <p className="text-sm text-amber-300 font-medium">
                    Ինքդ ընտրիր տառը ստորև բերված այբուբենից (A–Z)՝ այն բառում բացելու համար: (Մնացել է բացել {lettersToPick} տառ)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 15 Letter Boxes (Scoreboard Grid) */}
          <div className="py-6 flex flex-wrap justify-center gap-2 sm:gap-3">
            {targetChars.map((char, index) => {
              const isRevealed = revealedIndices.includes(index);
              const canClickToOpen = lettersToPick > 0 && !isRevealed;

              return (
                <div
                  key={index}
                  onClick={() => handleSlotClick(index)}
                  className={`relative group perspective-1000 select-none ${
                    canClickToOpen ? 'cursor-pointer' : isRevealed ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  title={
                    isRevealed
                      ? `Տառ ${index + 1}: ${char}`
                      : canClickToOpen
                      ? `Սեղմեք այս տուփը բացելու համար!`
                      : `Տուփ #${index + 1} (Ճիշտ պատասխանեք հարցին՝ բացելու համար)`
                  }
                >
                  <div
                    className={`w-11 h-16 sm:w-14 sm:h-20 md:w-16 md:h-22 rounded-xl flex flex-col items-center justify-center font-black transition-all duration-300 transform ${
                      canClickToOpen
                        ? 'ring-3 ring-amber-400 shadow-xl shadow-amber-500/50 hover:scale-105 animate-bounce'
                        : ''
                    } ${
                      isRevealed
                        ? 'bg-gradient-to-b from-amber-400 via-amber-300 to-yellow-500 text-slate-950 shadow-md shadow-amber-400/25 border-2 border-amber-200'
                        : 'bg-gradient-to-b from-slate-800 to-slate-950 text-slate-400 border border-slate-700 hover:border-amber-500/60'
                    }`}
                  >
                    {/* Index Number on top */}
                    <span
                      className={`text-[10px] sm:text-xs font-bold tracking-wider absolute top-1 ${
                        isRevealed ? 'text-slate-900/80' : 'text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>

                    {/* Letter Character or Placeholder */}
                    <span
                      className={`text-2xl sm:text-3xl md:text-4xl font-black ${
                        isRevealed
                          ? 'text-slate-950 scale-100 drop-shadow-sm'
                          : canClickToOpen
                          ? 'text-amber-400 animate-pulse'
                          : 'text-slate-600'
                      }`}
                    >
                      {isRevealed ? char : canClickToOpen ? '?' : '★'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Spanish Alphabet Keyboard (A–Z) */}
          <div
            ref={alphabetRef}
            className={`mt-3 pt-4 border-t border-slate-800 rounded-xl transition-all p-3 sm:p-4 ${
              lettersToPick > 0
                ? 'bg-amber-500/10 border-2 border-amber-400/80 shadow-lg shadow-amber-500/20 animate-pulse-glow'
                : 'bg-slate-950/40 border border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">🔤</span>
                <span className="font-extrabold text-sm sm:text-base text-amber-300 uppercase tracking-wide">
                  Ընտրիր տառը այբուբենից · Elige una letra (A–Z)
                </span>
              </div>
              {lettersToPick > 0 ? (
                <span className="text-xs sm:text-sm bg-amber-500 text-slate-950 px-3 py-1 rounded-full font-black animate-bounce flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-amber-500/40">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ընտրիր տառը! (մնացել է {lettersToPick})</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  (Ճիշտ պատասխանիր հարցին՝ տառ ընտրելու համար)
                </span>
              )}
            </div>

            {/* All 27 Spanish Alphabet Keys */}
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 my-1">
              {SPANISH_ALPHABET.map(letter => {
                const isGuessed = guessedLetters.includes(letter);
                const isTargetLetter = targetChars.includes(letter);

                let btnStyle = '';
                if (isGuessed) {
                  if (isTargetLetter) {
                    btnStyle = 'bg-emerald-600 text-white border-2 border-emerald-400 font-black shadow-md shadow-emerald-500/30';
                  } else {
                    btnStyle = 'bg-slate-900/80 text-rose-400 border border-rose-900/40 line-through opacity-60';
                  }
                } else if (lettersToPick > 0) {
                  btnStyle = 'bg-gradient-to-b from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/30 hover:scale-110 active:scale-95 ring-2 ring-amber-300 animate-pulse';
                } else {
                  btnStyle = 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-amber-400/60';
                }

                return (
                  <button
                    key={letter}
                    onClick={() => handleAlphabetLetterClick(letter)}
                    disabled={isGuessed}
                    className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all flex items-center justify-center relative ${btnStyle}`}
                    title={
                      isGuessed
                        ? isTargetLetter
                          ? `«${letter}» տառը գտնվել է բառում ✓`
                          : `«${letter}» տառը չկա բառում ✗`
                        : lettersToPick > 0
                        ? `Ընտրել «${letter}» տառը`
                        : `Տառ ${letter}`
                    }
                  >
                    <span>{letter}</span>
                    {isGuessed && isTargetLetter && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 text-slate-950 rounded-full text-[9px] flex items-center justify-center font-black">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Translation hint */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Գտնված: {guessedLetters.filter(l => targetChars.includes(l)).length}
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Չգտնված: {guessedLetters.filter(l => !targetChars.includes(l)).length}
                </span>
              </div>
              <div className="text-slate-300 font-medium">
                Ամբողջ բառի թարգմանությունը՝{' '}
                <span className="text-amber-400 font-extrabold text-base">
                  «{TARGET_WORD_TRANSLATION_HY}»
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SECTION 2: WHEEL OF FORTUNE (ԹՄԲՈՒԿ / RUEDA) & ACTION BAR
            ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive Drum / Wheel */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center shadow-xl relative">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <RotateCw className={`w-4 h-4 text-amber-400 ${isSpinning ? 'animate-spin' : ''}`} />
                <h3 className="text-sm font-bold text-slate-200">
                  Պտտիր թմբուկը · Ruleta de la Suerte
                </h3>
              </div>
              <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                Խաղադրույք: {currentStakePoints} մ.
              </span>
            </div>

            {/* Wheel graphic with SVG segments */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center">
              {/* Pointer indicator at top */}
              <div className="absolute -top-3 z-20 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow-md" />
              </div>

              {/* Rotating Wheel SVG */}
              <div
                className="w-full h-full rounded-full transition-transform ease-out shadow-2xl"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transitionDuration: isSpinning ? '3200ms' : '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)'
                }}
              >
                <svg viewBox="0 0 300 300" className="w-full h-full">
                  <defs>
                    <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="70%" stopColor="#eab308" />
                      <stop offset="100%" stopColor="#ca8a04" />
                    </radialGradient>
                  </defs>

                  {/* Draw circular slices */}
                  {WHEEL_SECTORS.map((sector, idx) => {
                    const count = WHEEL_SECTORS.length;
                    const angle = 360 / count;
                    const startAngle = idx * angle;
                    const endAngle = startAngle + angle;

                    const radStart = (Math.PI / 180) * (startAngle - 90);
                    const radEnd = (Math.PI / 180) * (endAngle - 90);
                    const r = 145;
                    const cx = 150;
                    const cy = 150;

                    const x1 = cx + r * Math.cos(radStart);
                    const y1 = cy + r * Math.sin(radStart);
                    const x2 = cx + r * Math.cos(radEnd);
                    const y2 = cy + r * Math.sin(radEnd);

                    const midRad = (radStart + radEnd) / 2;
                    const textR = 100;
                    const tx = cx + textR * Math.cos(midRad);
                    const ty = cy + textR * Math.sin(midRad);
                    const textAngle = (startAngle + endAngle) / 2;

                    return (
                      <g key={idx}>
                        <path
                          d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                          fill={sector.color}
                          stroke="#0f172a"
                          strokeWidth="2.5"
                        />
                        {/* Text label */}
                        <g transform={`rotate(${textAngle}, ${tx}, ${ty})`}>
                          <text
                            x={tx}
                            y={ty}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={sector.textColor}
                            fontWeight="900"
                            fontSize="16"
                            fontFamily="Montserrat, sans-serif"
                          >
                            {sector.label}
                          </text>
                          {sector.subLabel && (
                            <text
                              x={tx}
                              y={ty + 14}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={sector.textColor}
                              fontWeight="700"
                              fontSize="8"
                              opacity="0.9"
                            >
                              {sector.subLabel}
                            </text>
                          )}
                        </g>
                      </g>
                    );
                  })}

                  {/* Gold Center hub */}
                  <circle cx="150" cy="150" r="32" fill="url(#hubGrad)" stroke="#78350f" strokeWidth="4" />
                  <circle cx="150" cy="150" r="14" fill="#0f172a" />
                  <circle cx="150" cy="150" r="6" fill="#facc15" />
                </svg>
              </div>
            </div>

            {/* Spin button */}
            <button
              onClick={spinWheel}
              disabled={isSpinning}
              className={`mt-3 w-full py-2.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                isSpinning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Թմբուկը պտտվում է...' : 'Պտտել թմբուկը'}</span>
            </button>

            {/* Wheel Result Message */}
            {wheelResultMsg && (
              <div className="mt-3 p-2.5 bg-slate-800/90 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-center animate-fade-in w-full">
                {wheelResultMsg}
              </div>
            )}
          </div>

          {/* Right Column: Situational Question (¿Qué harías tú? — Ի՞նչ կանեիր դու։) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              {/* Question Navigation & Section Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentQ.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      {currentQ.partTitleEs}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {currentQ.partTitleHy}
                    </span>
                  </div>
                </div>

                {/* Question index buttons */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={goToPrevQuestion}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                    title="Նախորդ հարցը"
                  >
                    ←
                  </button>
                  <span className="px-2 py-0.5 bg-slate-800/90 rounded text-xs font-mono font-bold text-amber-300">
                    {currentQuestionIndex + 1} / {SITUATION_QUESTIONS.length}
                  </span>
                  <button
                    onClick={goToNextQuestion}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                    title="Հաջորդ հարցը"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Title with Tap-To-Translate */}
              <div className="mb-4">
                <div
                  onClick={() => toggleItemTranslation(`title-${currentQ.id}`)}
                  className="cursor-pointer group flex items-start justify-between gap-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 transition"
                  title="Սեղմեք հայերեն թարգմանության համար"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`${fontTitleClass} text-white group-hover:text-amber-300 transition tracking-tight`}>
                        {currentQ.titleEs}
                      </h2>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.speakSpanish(currentQ.titleEs);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-400 transition rounded-lg hover:bg-slate-800"
                        title="Լսել իսպաներեն արտասանությունը"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    {(isItemTranslated(`title-${currentQ.id}`) || showAllTranslations) && (
                      <p className="mt-1.5 text-sm sm:text-base md:text-lg text-amber-400 font-semibold">
                        🇦🇲 {currentQ.titleHy}
                      </p>
                    )}
                  </div>

                  <span className="text-xs bg-slate-800 group-hover:bg-amber-500/20 text-slate-300 group-hover:text-amber-300 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 shrink-0 font-medium">
                    <Languages className="w-4 h-4" />
                    <span>{isItemTranslated(`title-${currentQ.id}`) ? 'Փակել' : 'Թարգմանել'}</span>
                  </span>
                </div>
              </div>

              {/* Scenario Body with Tap-to-Translate */}
              <div
                onClick={() => toggleItemTranslation(`scenario-${currentQ.id}`)}
                className="cursor-pointer group bg-gradient-to-br from-slate-950 to-indigo-950/40 p-4 sm:p-5 rounded-2xl border border-slate-700/80 hover:border-amber-400/50 transition mb-5 relative shadow-inner"
                title="Սեղմեք իսպաներեն տեքստին՝ հայերեն թարգմանությունը բացելու համար"
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1">
                      <span>🇪🇸 Իրավիճակ (Español):</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.speakSpanish(currentQ.scenarioEs);
                      }}
                      className="text-slate-400 hover:text-amber-400 transition p-1 hover:bg-slate-800 rounded-lg"
                      title="Լսել իսպաներեն"
                    >
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Սեղմիր թարգմանության համար</span>
                  </span>
                </div>

                <p className={`${fontScenarioClass} text-slate-100 font-medium`}>
                  {currentQ.scenarioEs}
                </p>

                {/* Armenian Translation Box */}
                {(isItemTranslated(`scenario-${currentQ.id}`) || showAllTranslations) && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-800/90 animate-fade-in">
                    <span className="text-xs sm:text-sm font-bold text-amber-300 block mb-1">
                      🇦🇲 Հայերեն տարբերակը:
                    </span>
                    <p className={`${fontScenarioHyClass} text-amber-100/95 font-normal`}>
                      {currentQ.scenarioHy}
                    </p>
                  </div>
                )}
              </div>

              {/* Options Header */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Opciones / Տարբերակներ (Ընտրիր 1-ը):
                </span>
                <span className="text-xs text-slate-400">
                  Սեղմիր տարբերակին՝ հայերենը տեսնելու համար
                </span>
              </div>

              {/* Options A, B, C, D */}
              <div className="space-y-3">
                {currentQ.options.map((option) => {
                  const isSelected = answeredCurrent?.selected === option.key;
                  const isAnswered = !!answeredCurrent;
                  const isThisCorrect = currentQ.correctAnswer === option.key;
                  const showTranslation = isItemTranslated(`option-${currentQ.id}-${option.key}`) || showAllTranslations;

                  let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-950/60';
                  if (isAnswered) {
                    if (isThisCorrect) {
                      borderClass = 'border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500/50';
                    } else if (isSelected && !isThisCorrect) {
                      borderClass = 'border-rose-500/80 bg-rose-950/50 text-rose-200';
                    }
                  }

                  return (
                    <div
                      key={option.key}
                      onClick={() => {
                        if (!isAnswered) {
                          handleSelectOption(option.key);
                        } else {
                          toggleItemTranslation(`option-${currentQ.id}-${option.key}`);
                        }
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border transition cursor-pointer relative group ${borderClass}`}
                    >
                      <div className="flex items-start gap-3 sm:gap-3.5">
                        {/* Option letter badge */}
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 shadow-sm ${
                            isAnswered && isThisCorrect
                              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                              : isAnswered && isSelected
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950'
                          }`}
                        >
                          {option.key}
                        </div>

                        {/* Text and translation */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`${fontOptionClass} text-slate-100`}>
                              {option.es}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  sound.speakSpanish(option.es);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                                title="Լսել արտասանությունը"
                              >
                                <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemTranslation(`option-${currentQ.id}-${option.key}`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                                title="Ցույց տալ հայերեն թարգմանությունը"
                              >
                                <Languages className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                              </button>
                            </div>
                          </div>

                          {/* Armenian translation below option */}
                          {showTranslation && (
                            <p className={`mt-2 ${fontOptionHyClass} text-amber-300 border-t border-slate-800/80 pt-1.5 leading-relaxed`}>
                              🇦🇲 {option.hy}
                            </p>
                          )}
                        </div>

                        {/* Status Icon */}
                        {isAnswered && (
                          <div className="shrink-0 self-center">
                            {isThisCorrect ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            ) : isSelected ? (
                              <XCircle className="w-6 h-6 text-rose-400" />
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feedback & Continue Action Banner */}
              {feedbackState && (
                <div
                  className={`mt-4 p-4 rounded-xl border animate-fade-in ${
                    feedbackState.isCorrect
                      ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-100'
                      : 'bg-amber-950/50 border-amber-500/60 text-amber-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                        {feedbackState.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                        )}
                        <span>{feedbackState.messageHy}</span>
                      </div>
                      <p className="text-xs sm:text-sm opacity-90">{feedbackState.messageEs}</p>
                    </div>

                    <button
                      onClick={goToNextQuestion}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 flex items-center gap-1.5 shrink-0 transition"
                    >
                      <span>Հաջորդը</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Explanation if answered */}
                  {currentQ.explanationEs && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs sm:text-sm space-y-1 leading-relaxed">
                      <p className="text-slate-200">
                        <span className="font-bold text-amber-400">💡 Ինչու՞: </span>
                        {currentQ.explanationEs}
                      </p>
                      {currentQ.explanationHy && (
                        <p className="text-amber-300 font-medium">🇦🇲 {currentQ.explanationHy}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Footer Navigation in Question Card */}
            <div className="mt-6 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Պատասխանված է՝{' '}
                <span className="text-white font-bold">{totalAnswered} / {SITUATION_QUESTIONS.length}</span>
                {' · '}
                Ճիշտ՝ <span className="text-emerald-400 font-bold">{correctCount}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={goToNextQuestion}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <span>Հաջորդ իրավիճակ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================
          MODAL 1: GUESS WHOLE WORD ("Ասել ամբողջ բառը")
          ======================================================== */}
      {showWordGuessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowWordGuessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Ասել ամբողջ բառը</h3>
                <p className="text-sm text-slate-400">Nombrar la palabra completa (15 letras)</p>
              </div>
            </div>

            <p className="text-sm text-slate-200 mb-4 leading-relaxed">
              Գիտե՞ք, թե ինչ բառ է թաքնված: Իսպաներեն 15 տառից բաղկացած մակբայ, որը նշանակում է «մոտավորապես»: Մուտքագրեք բառը՝ խաղը հաղթելու համար:
            </p>

            <form onSubmit={handleFullWordGuess} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={wordGuessInput}
                  onChange={(e) => setWordGuessInput(e.target.value)}
                  placeholder="Օրինակ՝ APROXIMADAMENTE"
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 text-white text-center font-black tracking-widest uppercase focus:outline-none focus:border-amber-400 text-xl"
                  autoFocus
                />
              </div>

              {guessError && (
                <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-sm text-rose-200">
                  {guessError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWordGuessModal(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition"
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:from-amber-400 hover:to-yellow-400 transition"
                >
                  Հաստատել բառը
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: GAME VICTORY (Շնորհավորանքներ)
          ======================================================== */}
      {isGameWon && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center relative overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/40 mb-4 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <span className="text-sm uppercase font-extrabold tracking-widest text-amber-400">
              ¡FELICITACIONES! · ՇՆՈՐՀԱՎՈՐՈՒՄ ԵՆՔ!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Դուք հաղթեցիք «Հրաշքների Դաշտը»!
            </h2>

            <div className="my-5 p-5 bg-slate-950/80 border border-amber-500/40 rounded-2xl">
              <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-wider">
                {TARGET_WORD}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-100 mt-2">
                🇦🇲 Հայերեն թարգմանությունը՝ «{TARGET_WORD_TRANSLATION_HY}»
              </div>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {TARGET_WORD_DEFINITION_HY}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Վաստակած միավոր</div>
                <div className="text-2xl font-black text-amber-400">{score}</div>
              </div>
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400">Ճիշտ պատասխաններ</div>
                <div className="text-2xl font-black text-emerald-400">
                  {correctCount} / {SITUATION_QUESTIONS.length}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleRestart}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-xl text-sm sm:text-base shadow-lg hover:from-amber-400 hover:to-yellow-300 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Խաղալ նորից</span>
              </button>
              <button
                onClick={() => setIsGameWon(false)}
                className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm sm:text-base font-semibold transition"
              >
                Շարունակել ուսումնասիրել
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: 30 QUESTIONS BROWSER / SELECTOR
          ======================================================== */}
      {showQuestionBrowser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base sm:text-lg">
                  30 Իրավիճակային հարցեր (¿Qué harías tú?)
                </h3>
              </div>
              <button
                onClick={() => setShowQuestionBrowser(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {SITUATION_QUESTIONS.map((q, idx) => {
                const answerStatus = userAnswers[q.id];
                const isCurrent = idx === currentQuestionIndex;

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      setShowQuestionBrowser(false);
                      setFeedbackState(null);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-amber-500/10 border-amber-400 text-white'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{q.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            #{q.numberDisplay}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-white">
                            {q.titleEs}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                          {q.titleHy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {answerStatus ? (
                        answerStatus.isCorrect ? (
                          <span className="text-xs bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-800 font-bold">
                            Ճիշտ է
                          </span>
                        ) : (
                          <span className="text-xs bg-rose-950 text-rose-400 px-2.5 py-1 rounded-md border border-rose-800 font-bold">
                            Սխալ
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-500">Չխաղացված</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: RULES / INSTRUCTIONS (Խաղի կանոնները)
          ======================================================== */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-7 h-7 text-amber-400" />
              <h3 className="text-xl font-black text-white">Խաղի կանոնները · Reglas del Juego</h3>
            </div>

            <div className="space-y-3.5 text-sm sm:text-base text-slate-200 leading-relaxed">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1 text-base">
                  1. Հիմնական բառը՝ APROXIMADAMENTE (15 տառ)
                </span>
                Խաղի նպատակն է բացել բոլոր 15 տառերը կամ ճիշտ ասել ամբողջ բառը: Բառը նշանակում է «մոտավորապես»:
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1 text-base">
                  2. Իրավիճակային հարցեր (¿Qué harías tú? — Ի՞նչ կանեիր դու)
                </span>
                Կարդացեք իսպաներեն իրավիճակը և ընտրեք 4 տարբերակներից լավագույնը: Սեղմեք ցանկացած իսպաներեն տեքստի վրա՝ հայերեն թարգմանությունը տեսնելու համար:
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1 text-base">
                  3. Տառ ընտրելու իրավունք այբուբենից (A–Z)
                </span>
                Յուրաքանչյուր ճիշտ պատասխանի դեպքում (կամ թմբուկի «+» բաժնից) դուք իրավունք եք ստանում ինքներդ ընտրել տառ ամբողջական այբուբենից (A–Z): Եթե տառը կա «APROXIMADAMENTE» բառում, այն բացվում է:
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1 text-base">
                  4. Սխալ պատասխանի դեպքում խաղը ՉԻ ԱՎԱՐՏՎՈՒՄ!
                </span>
                Եթե ընտրեք ոչ ճիշտ տարբերակ, խաղը հանգիստ շարունակվում է: Կարող եք կարդալ բացատրությունը, սովորել նոր բառեր և անցնել հաջորդ իրավիճակներին:
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition"
              >
                Հասկացա, սկսենք!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>
          Pole Chudes: ¿Qué harías tú? — Իսպաներեն-հայերեն իրավիճակային ինտերակտիվ խաղ (A2–B1) · Главное слово: <span className="text-amber-400 font-bold">APROXIMADAMENTE</span>
        </p>
      </footer>
    </div>
  );
}
