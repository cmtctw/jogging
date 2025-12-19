
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Youtube, Clock, Zap, MessageSquareQuote, Settings2, Heart, RefreshCw } from 'lucide-react';
import { metronome } from './services/audioService';
import { WorkoutStatus } from './types';
import { GoogleGenAI } from "@google/genai";

// 安全地獲取 API Key，防止在瀏覽器環境中 process 未定義導致崩潰
const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : '';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

const App: React.FC = () => {
  // Config state
  const [duration, setDuration] = useState(30);
  const [bpm, setBpm] = useState(180);
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=n_vM68cQ49k');
  const [embedUrl, setEmbedUrl] = useState('');

  // Running state
  const [status, setStatus] = useState<WorkoutStatus>(WorkoutStatus.IDLE);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [coachTip, setCoachTip] = useState("準備好開始你的超慢跑旅程了嗎？笑容是最好的節奏指標。");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const timerRef = useRef<number | null>(null);

  const parseYoutubeUrl = useCallback((url: string) => {
    if (!url) return '';
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[7].length === 11) ? match[7] : null;

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1`;
    }
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}?rel=0&enablejsapi=1`;
    }
    return '';
  }, []);

  const updateVideo = () => {
    const newEmbed = parseYoutubeUrl(youtubeUrl);
    setEmbedUrl(newEmbed);
  };

  useEffect(() => {
    updateVideo();
    console.log("App Mounted - Visual confirmation in console");
  }, [youtubeUrl, parseYoutubeUrl]);

  useEffect(() => {
    if (status === WorkoutStatus.RUNNING) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const fetchCoachTip = async () => {
    if (!apiKey) return;
    setIsAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一位專業的超慢跑教練。請為正在以 ${bpm} BPM 慢跑的使用者提供一句簡短且具鼓勵性的中文建議。重點在於姿勢、呼吸或「Niko Niko」微笑原則。風格要溫暖、柔和且正面。`,
      });
      setCoachTip(response.text || "保持微笑，輕鬆跨出每一步。");
    } catch (error) {
      console.error("AI tip failed", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (status === WorkoutStatus.RUNNING && timeLeft > 0 && timeLeft % 300 === 0) {
      fetchCoachTip();
    }
  }, [status, timeLeft]);

  const handleStart = () => {
    if (status === WorkoutStatus.IDLE) {
      setTimeLeft(duration * 60);
    }
    metronome.setBPM(bpm);
    metronome.start();
    setStatus(WorkoutStatus.RUNNING);
  };

  const handlePause = () => {
    metronome.stop();
    setStatus(WorkoutStatus.PAUSED);
  };

  const handleStop = () => {
    metronome.stop();
    setStatus(WorkoutStatus.IDLE);
    setTimeLeft(duration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fdf6e3] text-[#44403c]">
      <header className="w-full h-24 flex items-center justify-between px-8 border-b border-[#e6dec3] bg-[#fefae0]/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
             <Heart className="w-6 h-6 text-[#8b9a47]" fill="#8b9a47" />
             <h1 className="text-2xl font-bold text-[#5c643c]">
              超慢跑助手
            </h1>
          </div>
          <p className="text-xs text-[#8c856e] font-medium tracking-[0.1em] mt-1">ULTRA SLOW JOGGING COMPANION</p>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-[#8c856e] uppercase font-bold tracking-wider">目前節拍</span>
            <div className="flex items-center gap-2 text-[#8b9a47] font-bold">
              <Zap className="w-4 h-4" />
              <span className="text-xl mono">{bpm} BPM</span>
            </div>
          </div>
          
          <div className="bg-[#f5ecd5] px-6 py-2 rounded-2xl border border-[#d4ccb0] shadow-sm">
            <span className="text-[10px] text-[#8c856e] block mb-0.5 uppercase font-bold">剩餘時間</span>
            <div className={`mono text-4xl font-bold tracking-tight ${status === WorkoutStatus.RUNNING ? 'text-[#8b9a47]' : 'text-[#a8a29e]'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex-1 bg-white rounded-[2.5rem] overflow-hidden border border-[#e6dec3] shadow-md relative group min-h-[450px]">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                title="Workout Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#fefae0]/30 p-12 text-center">
                <div className="w-20 h-20 bg-[#f5ecd5] rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Youtube className="w-10 h-10 text-[#d4ccb0]" />
                </div>
                <h3 className="text-xl font-semibold text-[#8c856e] mb-2">等待載入影片</h3>
                <p className="text-[#a8a29e] max-w-sm">請貼上正確的 YouTube 影片連結。</p>
              </div>
            )}
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-white/90 backdrop-blur-md px-10 py-5 rounded-full border border-[#e6dec3] shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300">
              {status === WorkoutStatus.RUNNING ? (
                <button 
                  onClick={handlePause}
                  className="p-4 bg-[#f5ecd5] hover:bg-[#e6dec3] rounded-full transition-all text-[#5c643c]"
                >
                  <Pause className="w-6 h-6 fill-current" />
                </button>
              ) : (
                <button 
                  onClick={handleStart}
                  className="p-4 bg-[#8b9a47] hover:bg-[#7a883a] rounded-full transition-all text-white shadow-md shadow-[#8b9a47]/20"
                >
                  <Play className="w-6 h-6 fill-current ml-1" />
                </button>
              )}
              <div className="h-8 w-px bg-[#e6dec3]"></div>
              <button 
                onClick={handleStop}
                className="p-4 bg-[#f5ecd5] hover:bg-[#e6dec3] rounded-full transition-all text-[#8c856e]"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#e6dec3] rounded-[2rem] p-6 flex items-start gap-5 shadow-sm">
            <div className="mt-1 p-3 bg-[#fefae0] rounded-2xl border border-[#e6dec3]">
              <MessageSquareQuote className="w-6 h-6 text-[#8b9a47]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#8b9a47] mb-1 uppercase tracking-widest">暖心教練建議</h4>
              <p className={`text-[#78716c] leading-relaxed transition-all duration-500 ${isAiLoading ? 'blur-sm opacity-50' : 'blur-0 opacity-100'}`}>
                「{coachTip}」
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-[#e6dec3] shadow-sm space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#fefae0] rounded-lg">
                <Settings2 className="w-5 h-5 text-[#8b9a47]" />
              </div>
              <h3 className="text-lg font-bold text-[#5c643c]">個人化設定</h3>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#8c856e]">設定時間 (分鐘)</label>
                  <span className="mono text-[#8b9a47] font-bold bg-[#fefae0] px-3 py-1 rounded-full border border-[#e6dec3]">{duration}m</span>
                </div>
                <input 
                  type="range" min="1" max="90" value={duration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setDuration(val);
                    if (status === WorkoutStatus.IDLE) setTimeLeft(val * 60);
                  }}
                  className="w-full accent-[#8b9a47] h-2 bg-[#f5ecd5] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-[#8c856e]">節拍設定 (BPM)</label>
                  <span className="mono text-[#d4a373] font-bold bg-[#fdf2e9] px-3 py-1 rounded-full border border-[#f5d0b0]">{bpm}</span>
                </div>
                <input 
                  type="range" min="150" max="200" value={bpm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBpm(val);
                    metronome.setBPM(val);
                  }}
                  className="w-full accent-[#d4a373] h-2 bg-[#fdf2e9] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-[#f5ecd5]">
                <label className="text-sm font-medium text-[#8c856e] block">YouTube 連結</label>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <input 
                      type="text" 
                      placeholder="貼上您想看的影片..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="w-full bg-[#fefae0]/50 border border-[#e6dec3] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b9a47]/20 transition-all text-[#44403c] pr-12"
                    />
                    <Youtube className="absolute right-5 top-4 w-5 h-5 text-[#d4ccb0] group-focus-within:text-[#8b9a47] transition-colors" />
                  </div>
                  <button 
                    onClick={updateVideo}
                    className="p-4 bg-[#f5ecd5] hover:bg-[#e6dec3] rounded-2xl text-[#8b9a47] transition-colors shadow-sm"
                    title="重新載入影片"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={status === WorkoutStatus.RUNNING ? handlePause : handleStart}
              className={`w-full py-5 rounded-[1.5rem] font-bold text-lg transition-all shadow-md flex items-center justify-center gap-3 ${
                status === WorkoutStatus.RUNNING 
                  ? 'bg-[#f5ecd5] text-[#8c856e] hover:bg-[#e6dec3]' 
                  : 'bg-[#8b9a47] text-white hover:scale-[1.02] shadow-[#8b9a47]/10'
              }`}
            >
              {status === WorkoutStatus.RUNNING ? (
                <><Pause className="w-6 h-6 fill-current" /> 暫停運動</>
              ) : (
                <><Play className="w-6 h-6 fill-current" /> 開始超慢跑</>
              )}
            </button>
          </div>

          <div className="bg-[#fefae0]/60 rounded-[2.5rem] p-6 border border-[#e6dec3] shadow-sm">
            <h4 className="text-xs font-bold text-[#8b9a47] mb-5 uppercase tracking-widest border-b border-[#e6dec3] pb-2">超慢跑三大要訣</h4>
            <div className="space-y-5">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-bold text-[#8b9a47] shrink-0 border border-[#e6dec3]">1</div>
                <p className="text-xs text-[#78716c] leading-relaxed">前腳掌著地，隨後腳跟落地，保護您的關節。</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-bold text-[#8b9a47] shrink-0 border border-[#e6dec3]">2</div>
                <p className="text-xs text-[#78716c] leading-relaxed">膝蓋保持微彎狀態，不要刻意繃緊蹬直。</p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-bold text-[#8b9a47] shrink-0 border border-[#e6dec3]">3</div>
                <p className="text-xs text-[#78716c] leading-relaxed">保持微笑，呼吸順暢，能輕鬆交談的速度最合適。</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 px-8 border-t border-[#e6dec3]/50 text-center">
        <p className="text-xs text-[#a8a29e] font-medium tracking-widest">
          溫柔對待身體 • 享受健康律動
        </p>
      </footer>
    </div>
  );
};

export default App;
