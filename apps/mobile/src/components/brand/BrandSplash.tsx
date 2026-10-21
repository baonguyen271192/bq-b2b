import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View,
  type StyleProp, type ViewStyle,
} from "react-native";
import MaskedViewRaw from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { File, Paths } from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { color, radius, space } from "@/theme";
import { Pill, T } from "../ui";

/**
 * Slogan đầy đủ của BQ, do phía BQ cung cấp. Trên splash chỉ dùng vế cuối: bản
 * đầy đủ ~95 ký tự, ở cỡ 15 sẽ xuống 4 dòng.
 */
export const BQ_SLOGAN_FULL =
  "Giày BQ đồng hành cùng khách hàng công sở với chất lượng cao, "
  + "trải nghiệm tự tin trên mọi hành trình.";
const SPLASH_TAGLINE = "Tự tin trên mọi hành trình";

// ---------------------------------------------------------------------------
// Cờ gỡ rối
// ---------------------------------------------------------------------------

/**
 * In mốc thời gian ra console.
 *
 * Bật sẵn ở bản dev; ở bản Release phải đặt `EXPO_PUBLIC_SPLASH_DEBUG=1` lúc
 * build. Metro THAY `process.env.EXPO_PUBLIC_*` BẰNG HẰNG SỐ lúc đóng gói, nên
 * khi không bật thì cả nhánh log bị loại khỏi bundle.
 */
const SPLASH_DEBUG = __DEV__ || process.env.EXPO_PUBLIC_SPLASH_DEBUG === "1";

/**
 * Ép luôn chạy bản đầy đủ. Không có cờ này thì chỉ lần mở ĐẦU TIÊN trong ngày
 * mới có vệt sáng và tagline — nghĩa là quay video lần thứ hai trở đi sẽ thấy
 * một splash khác hẳn, rất dễ tưởng hoạt cảnh hỏng.
 */
const FORCE_FULL = process.env.EXPO_PUBLIC_SPLASH_FORCE === "full";

// ---------------------------------------------------------------------------
// Hình học
// ---------------------------------------------------------------------------

/**
 * Bề rộng logo lúc NGHỈ, theo tỉ lệ bề rộng màn.
 *
 * LƯU Ý KHỚP VỚI NATIVE SPLASH: `imageWidth` của expo-splash-screen trong
 * app.json là một số pt CỐ ĐỊNH, không nhận phần trăm. Nên hai yêu cầu "logo
 * 34% bề rộng màn" và "native splash khớp đúng cỡ đó" chỉ đồng thời đúng trên
 * MỘT bề rộng màn. Đã chốt theo iPhone 17 Pro (402pt):
 *   0.92 × 0.34 × 402 = 125.7  ->  imageWidth = 126
 * Trên máy khác, khung JS đầu tiên lệch so với native splash:
 *   iPhone SE (375pt)         JS 117.3pt vs native 126pt  =>  +8.7pt
 *   iPhone 17 Pro Max (440pt) JS 137.6pt vs native 126pt  => -11.6pt
 * Muốn khớp tuyệt đối trên mọi máy thì đổi dòng dưới thành hằng số pt (137)
 * thay vì tỉ lệ — đánh đổi: logo không còn co theo bề rộng màn.
 */
const LOGO_WIDTH_RATIO = 0.34;
/** Bề rộng logo trong native splash, pt. PHẢI bằng `imageWidth` ở app.json. */
const NATIVE_LOGO_W = 126;
/** Tỉ lệ cao/rộng của logo-mark-white.png. */
const LOGO_RATIO = 0.565;
/** Logo vào từ cỡ này. Native splash đặt logo đúng ở cỡ 0.92 × cỡ nghỉ. */
const LOGO_START_SCALE = 0.92;

/** Tagline cách đáy logo bấy nhiêu. */
const TAGLINE_GAP = 24;
/** Tagline trượt lên bấy nhiêu khi hiện ra. */
const TAGLINE_RISE = 8;
/** Quầng sáng sau logo: đường kính ~2.5 lần bề rộng logo lúc nghỉ. */
const GLOW_RATIO = 2.5;
/** Quầng sáng: độ đục đỉnh, rồi độ đục đọng lại. */
const GLOW_PEAK = 0.2;
const GLOW_REST = 0.1;

/**
 * Chỉ hiện thanh tiến độ khi nạp lâu hơn mốc này.
 *
 * Phần lớn lần mở app sẽ KHÔNG thấy thanh nào — một thanh chạy vụt qua trong
 * 300ms chỉ làm màn hình bận rộn chứ không cho người dùng thông tin gì.
 */
const BAR_AFTER_MS = 1500;

/**
 * Màu dải sáng lướt qua logo.
 *
 * ĐÃ THỬ CẢ HAI trên bản Release, cắt khung từ video:
 *  - trắng + hạ độ đục logo xuống 0.85 giữa lúc quét: dải hiện rõ hơn, nhưng cả
 *    khối logo chuyển kem xám đục suốt 400ms — mất trắng sạch của thương hiệu.
 *  - kem phủ lên logo trắng (cách đang dùng): logo giữ trắng ở mọi khung.
 *
 * KHÔNG quay lại trắng tinh: phủ trắng lên trắng thì không thấy gì.
 */
const SHINE_COLOR = color.bqShine;
/** Bề ngang dải sáng, theo tỉ lệ bề rộng logo. */
const SHINE_W_RATIO = 0.45;

// ---------------------------------------------------------------------------
// Dòng thời gian. Mốc 0 là lúc người dùng THỰC SỰ nhìn thấy khung JS đầu tiên
// (sau onLayout -> hideAsync -> thêm một frame), KHÔNG phải lúc mount.
// ---------------------------------------------------------------------------

/** Bản ĐẦY ĐỦ (lần mở đầu trong ngày). Tagline xong ở 1200, giữ 600 rồi thoát. */
const FULL = {
  bg: { at: 0, dur: 500 },
  logo: { at: 0, dur: 500 },
  glow: { at: 0, dur: 900 },
  shine: { at: 500, dur: 600 },
  tagline: { at: 800, dur: 400 },
  /** Giữ bấy nhiêu SAU KHI hoạt cảnh chạy xong — xem chú thích ở effect thoát. */
  holdAfter: 600,
} as const;

/** Bản NGẮN (các lần mở sau): bỏ vệt sáng và tagline. */
const SHORT = {
  bg: { at: 0, dur: 400 },
  logo: { at: 0, dur: 500 },
  glow: { at: 0, dur: 700 },
  holdAfter: 400,
} as const;

/** Mờ vào khi bật Reduce Motion. */
const IN_REDUCED_MS = 260;
/** Thoát khi bật Reduce Motion: chỉ mờ, không zoom. */
const OUT_REDUCED_MS = 400;

// ---------------------------------------------------------------------------
// Thoát: TRƯỢT LÊN, không tan, không fade.
//
// Đã dựng và đo cách "zoom xuyên qua logo" (logo scale 1 -> 12 trong 450ms,
// nền cam tan 200ms khi logo đạt scale 3) rồi BỎ, vì nó trượt đúng tiêu chí
// "không khung nào chồng hai màn hình mờ lên nhau". Lý do là cấu trúc chứ
// không phải chỉnh số: hình "BQ" có khoảng hở nên ở scale 12 nó KHÔNG phủ kín
// màn — đo trên khung 2150ms thấy rõ bóng logo trắng khổng lồ nằm đè lên màn
// đăng nhập và cả màn bị ám cam. Mọi cách làm splash biến mất bằng độ đục đều
// sinh ra lớp bán trong suốt như vậy.
//
// Trượt thì mỗi điểm ảnh hoặc thuộc splash, hoặc thuộc màn đích — không bao
// giờ là hỗn hợp của cả hai.
// ---------------------------------------------------------------------------
const OUT_SLIDE_MS = 400;

/**
 * masked-view 0.3.2 khai component theo kiểu class của React 18; với kiểu của
 * React 19 nó không còn hợp lệ làm JSX element ("missing setState, render...").
 * Ép kiểu tại MỘT chỗ thay vì rắc `as any` ở nơi dùng. Runtime không đổi.
 *
 * CHỈ CHẠY TRÊN NATIVE. `MaskedView.web.js` trong gói là một stub: nó vẽ
 * `maskElement` rồi VỨT toàn bộ `children`, nên trên web lớp phủ và dải sáng
 * không bao giờ được render — chỉ còn đúng ảnh logo. Suy giảm êm, không vỡ.
 */
const MaskedView = MaskedViewRaw as unknown as React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  maskElement: React.ReactElement;
  children?: React.ReactNode;
}>;

/** RN 0.88 bỏ `StyleSheet.absoluteFillObject` khỏi kiểu; khai tường minh. */
const ABSOLUTE_FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

const STAMP_FILE = "bq-splash-last-open.txt";
/** Nơi đổ nhật ký mốc thời gian khi bật SPLASH_DEBUG. */
const DEBUG_LOG_FILE = "bq-splash-debug.log";

interface Variant {
  full: boolean;
  /** Vì sao ra bản này — để log nói được LÝ DO, không chỉ kết quả. */
  why: string;
}

/**
 * Hôm nay đã mở app lần nào chưa.
 *
 * `File.text()` của expo-file-system v58 là BẤT ĐỒNG BỘ nên không biết được
 * ngay lúc render đầu. Hoạt cảnh chỉ khởi động khi đã biết.
 *
 * Hỏng (web, quyền bị chặn) thì coi như lần đầu: thà xem hoạt cảnh đầy đủ còn
 * hơn vỡ splash.
 */
async function readVariant(): Promise<Variant> {
  if (FORCE_FULL) return { full: true, why: "ép bằng EXPO_PUBLIC_SPLASH_FORCE=full" };
  try {
    const f = new File(Paths.document, STAMP_FILE);
    const today = new Date().toISOString().slice(0, 10);
    const seen = f.exists ? (await f.text()).trim() : "";
    if (seen !== today) {
      await f.write(today);
      return { full: true, why: `lần mở đầu trong ngày (dấu mốc cũ: ${seen || "chưa có"})` };
    }
    return { full: false, why: `hôm nay đã mở rồi (dấu mốc: ${seen})` };
  } catch (e) {
    return { full: true, why: `không đọc được dấu mốc (${String(e)}) — coi như lần đầu` };
  }
}

export interface BrandSplashProps {
  /** Đã nạp xong mọi thứ cần thiết chưa. */
  ready: boolean;
  /** Tiến độ nạp THẬT, 0…1. */
  progress: number;
  /** Nạp hỏng — splash nhường chỗ cho màn lỗi, KHÔNG treo. */
  error?: string | null;
  onRetry?: () => void;
  /**
   * Gọi khi splash đã vẽ xong khung đầu; nơi gọi dùng để gỡ native splash.
   *
   * TRẢ VỀ PROMISE nếu việc gỡ là bất đồng bộ (`SplashScreen.hideAsync()`).
   * Dòng thời gian chỉ khởi động SAU KHI promise này xong và qua thêm một
   * frame — nếu không, hoạt cảnh chạy trong lúc native splash còn che và người
   * dùng chỉ nhìn thấy phần đuôi của nó.
   */
  onReadyToReveal?: () => Promise<void> | void;
  /** Gọi ở thời điểm BẮT ĐẦU thoát. Màn đích KHÔNG được animate theo. */
  onExitStart?: () => void;
  /** Gọi khi splash đã rời hẳn; nơi gọi gỡ component khỏi cây. */
  onFinish: () => void;
}

/**
 * Màn mở đầu: logo BQ trên nền cam.
 *
 * Logo đứng CỐ ĐỊNH giữa màn, đúng chỗ native splash đặt nó — chỉ `scale` chạy,
 * không có chuyển động vị trí, nên chuyển giao native → JS không xê dịch.
 */
export function BrandSplash({
  ready, progress, error, onRetry, onReadyToReveal, onExitStart, onFinish,
}: BrandSplashProps) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [showBar, setShowBar] = useState(false);
  /** Splash đã THỰC SỰ hiện trên màn chưa (native splash đã gỡ + qua một frame). */
  const [onScreen, setOnScreen] = useState(false);
  /** Status bar đổi sang chữ tối khi splash bắt đầu rời vùng status bar. */
  const [statusDark, setStatusDark] = useState(false);
  const [variant, setVariant] = useState<Variant | null>(null);
  /** Hoạt cảnh vào đã chạy hết chưa — mốc neo cho nhịp giữ. */
  const [timelineDone, setTimelineDone] = useState(false);

  const beat = variant?.full === false ? SHORT : FULL;

  // --- Nhật ký mốc thời gian ------------------------------------------------
  // Date.now() là lời gọi KHÔNG THUẦN nên không được chạy trong thân render
  // (React Compiler chặn đúng). Gán trong effect mount.
  const t0 = useRef<number | null>(null);
  // Gom vào bộ nhớ rồi GHI MỘT LẦN lúc thoát. Ghi file ngay mỗi mốc sẽ chen I/O
  // vào đúng quãng dòng thời gian đang chạy — thứ mà chính mục 2 cấm.
  const logLines = useRef<string[]>([]);
  const log = useCallback((event: string, detail?: string) => {
    if (!SPLASH_DEBUG) return;
    const base = t0.current;
    const at = base === null ? "   ?" : String(Date.now() - base).padStart(4);
    const line = `[splash] +${at}ms  ${event}${detail ? `  — ${detail}` : ""}`;
    logLines.current.push(line);
    // eslint-disable-next-line no-console
    console.log(line);
  }, []);

  /**
   * Đổ nhật ký ra file.
   *
   * Ở bản Release, `console.log` của React Native KHÔNG đi ra os_log — đã thử:
   * `log stream` bắt được 217 dòng của tiến trình app mà không dòng nào của JS.
   * Nên muốn đo bản Release thì phải có sink khác. Đọc lại bằng:
   *   xcrun simctl get_app_container <udid> <bundle> data
   *   cat <đường dẫn>/Documents/bq-splash-debug.log
   */
  const flushLog = useCallback(() => {
    if (!SPLASH_DEBUG || logLines.current.length === 0) return;
    const body = `${logLines.current.join("\n")}\n`;
    logLines.current = [];
    void (async () => {
      try {
        await new File(Paths.document, DEBUG_LOG_FILE).write(body);
      } catch {
        // Nhật ký gỡ rối hỏng thì kệ: không được để nó làm vỡ splash.
      }
    })();
  }, []);

  const v = useMemo(() => ({
    bg: new Animated.Value(0),
    logoScale: new Animated.Value(LOGO_START_SCALE),
    glowOpacity: new Animated.Value(0),
    glowScale: new Animated.Value(0.6),
    shineX: new Animated.Value(0),
    taglineOpacity: new Animated.Value(0),
    taglineY: new Animated.Value(TAGLINE_RISE),
    screenOpacity: new Animated.Value(1),   // chỉ dùng ở nhánh Reduce Motion
    slideY: new Animated.Value(0),
    bar: new Animated.Value(0),
  }), []);

  // --- Thứ tự bắt buộc ------------------------------------------------------
  // mount -> onLayout -> await hideAsync() -> +1 frame -> mới start timeline.
  const revealing = useRef(false);
  const handleLayout = useCallback(() => {
    if (revealing.current) return;
    revealing.current = true;
    log("onLayout — khung JS đầu đã vẽ, gọi hideAsync()");
    void Promise.resolve(onReadyToReveal?.()).then(() => {
      log("hideAsync xong — native splash đã gỡ");
      // Thêm MỘT frame: hideAsync resolve không có nghĩa là khung đầu tiên
      // không-còn-native đã lên màn. Không chờ thì vài khung đầu của hoạt cảnh
      // chạy sau tấm che.
      requestAnimationFrame(() => {
        log("qua thêm 1 frame — mở cổng dòng thời gian");
        setOnScreen(true);
      });
    });
  }, [onReadyToReveal, log]);

  useEffect(() => {
    t0.current = Date.now();
    log("mount");
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => { log("đọc xong Reduce Motion", on ? "BẬT" : "tắt"); setReduceMotion(on); })
      .catch(() => { log("đọc Reduce Motion hỏng", "coi như tắt"); setReduceMotion(false); });
    void readVariant().then((r) => {
      log("đọc xong dấu mốc ngày", `${r.full ? "ĐẦY ĐỦ" : "NGẮN"} — ${r.why}`);
      setVariant(r);
    });
  }, [log]);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setShowBar(true), BAR_AFTER_MS);
    return () => clearTimeout(t);
  }, [ready]);

  // --- Hoạt cảnh vào --------------------------------------------------------
  // Cổng gồm BA điều kiện. Thiếu `onScreen` chính là lỗi cũ: hoạt cảnh chạy
  // ngay khi hai lời hứa trả về, trong lúc native splash còn che, nên người
  // dùng chỉ thấy phần đuôi — hoặc không thấy gì.
  useEffect(() => {
    if (!onScreen || reduceMotion === null || variant === null) return;
    const isFull = variant.full;

    if (reduceMotion) {
      // Reduce Motion: không phóng, không quét, không trượt — nhưng VẪN mờ dần.
      // Mờ dần không phải chuyển động; đó chính là thứ Apple khuyến nghị dùng
      // thay cho chuyển động, và lối thoát của màn này vốn đã mờ dần.
      log("bắt đầu dòng thời gian", "Reduce Motion — chỉ mờ dần");
      v.logoScale.setValue(1);
      v.glowScale.setValue(1);
      v.taglineY.setValue(0);
      Animated.parallel([
        Animated.timing(v.bg, {
          toValue: 1, duration: IN_REDUCED_MS, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v.glowOpacity, {
          toValue: GLOW_REST, duration: IN_REDUCED_MS, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v.taglineOpacity, {
          toValue: isFull ? 1 : 0, duration: IN_REDUCED_MS,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) setTimelineDone(true); });
      return;
    }

    log("bắt đầu dòng thời gian", isFull ? "bản ĐẦY ĐỦ" : "bản NGẮN");
    const seq: Animated.CompositeAnimation[] = [
      Animated.sequence([
        Animated.delay(beat.bg.at),
        Animated.timing(v.bg, {
          toValue: 1, duration: beat.bg.dur, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Logo 0.92 -> 1 với back(1.4): vượt qua 1 một chút rồi lắng lại, đủ để
      // mắt bắt được. Bản trước nở 1 -> 1.06 -> 1 và đo được +13% diện tích
      // pixel sáng — tồn tại, nhưng không ai nhìn thấy.
      Animated.sequence([
        Animated.delay(beat.logo.at),
        Animated.timing(v.logoScale, {
          toValue: 1, duration: beat.logo.dur, easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]),
      // Quầng sáng nở 0.6 -> 1 trong khi độ đục đi 0 -> 0.2 -> 0.1. Alpha đỉnh
      // của glow.png là 255 nên các số này là nghĩa đen.
      Animated.sequence([
        Animated.delay(beat.glow.at),
        Animated.timing(v.glowScale, {
          toValue: 1, duration: beat.glow.dur, easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(beat.glow.at),
        Animated.timing(v.glowOpacity, {
          toValue: GLOW_PEAK, duration: beat.glow.dur * 0.45,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(v.glowOpacity, {
          toValue: GLOW_REST, duration: beat.glow.dur * 0.55,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ]),
    ];

    if (isFull) {
      seq.push(
        Animated.sequence([
          Animated.delay(FULL.shine.at),
          Animated.timing(v.shineX, {
            toValue: 1, duration: FULL.shine.dur, easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(FULL.tagline.at),
          Animated.parallel([
            Animated.timing(v.taglineOpacity, {
              toValue: 1, duration: FULL.tagline.dur, easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(v.taglineY, {
              toValue: 0, duration: FULL.tagline.dur, easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    }

    Animated.parallel(seq).start(({ finished }) => {
      if (!finished) return;
      log("dòng thời gian chạy xong");
      setTimelineDone(true);
    });
  }, [onScreen, reduceMotion, variant, beat, v, log]);

  // --- Thanh tiến độ bám tiến độ nạp THẬT -----------------------------------
  useEffect(() => {
    Animated.timing(v.bar, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 220,
      easing: Easing.out(Easing.quad),
      // scaleX chạy trên UI thread; `width` thì không.
      useNativeDriver: true,
    }).start();
  }, [progress, v.bar]);

  // --- Thoát ----------------------------------------------------------------
  // Mốc giữ tính từ lúc splash LÊN MÀN, không từ lúc mount: tính từ mount thì
  // quãng native splash còn che bị trừ vào thời gian giữ.
  // Mốc giữ neo vào lúc hoạt cảnh THẬT SỰ chạy xong, không vào đồng hồ.
  //
  // Bản trước đếm `hold` bằng setTimeout kể từ lúc `onScreen`. Đo trên video
  // bản Release: khung hoạt cảnh ĐẦU TIÊN lên màn trễ ~250ms so với lời gọi
  // `.start()` — lúc khởi động nguội, việc gắn các node vào native driver vẫn
  // phải đi qua JS thread đang bận (expo-router dựng cây, nạp font, gọi khởi
  // tạo). Hệ quả: nhịp giữ đo được chỉ 1557ms thay vì 1800ms, tức tagline vừa
  // hiện xong thì splash đã bắt đầu trượt đi. Neo vào callback `finished` thì
  // trễ bao nhiêu cũng không ăn vào thời gian giữ.
  const doneAt = useRef<number | null>(null);
  useEffect(() => {
    if (timelineDone && doneAt.current === null) doneAt.current = Date.now();
  }, [timelineDone]);

  useEffect(() => {
    if (!timelineDone || !ready || error) return;
    const since = doneAt.current ?? Date.now();
    const delay = Math.max(0, beat.holdAfter - (Date.now() - since));
    let statusTimer: ReturnType<typeof setTimeout> | null = null;

    const t = setTimeout(() => {
      log("bắt đầu thoát", reduceMotion ? "mờ dần" : "trượt lên");
      onExitStart?.();

      if (reduceMotion) {
        setStatusDark(true);
        Animated.timing(v.screenOpacity, {
          toValue: 0, duration: OUT_REDUCED_MS, easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }).start(() => { log("thoát xong"); flushLog(); onFinish(); });
        return;
      }

      // Trượt cả tấm splash lên khỏi màn. Màn đích đã render sẵn bên dưới ở
      // opacity 1 và KHÔNG animate — hai lớp cùng mờ vào nhau chính là thứ tạo
      // cảm giác "cam đục lẫn chữ" ở bản trước.
      Animated.timing(v.slideY, {
        toValue: -height, duration: OUT_SLIDE_MS, easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        log("thoát xong");
        flushLog();
        // Gỡ ở frame SAU: unmount cây view ngay trong khung cuối sẽ cướp frame đó.
        requestAnimationFrame(() => onFinish());
      });

      // Status bar đổi đúng lúc mép dưới splash vượt lên trên vùng status bar.
      // Với Easing.in(Easing.cubic) và vùng status bar cao ~59pt:
      //   translateY(t) = -height·t³ ;  mép dưới = translateY + height < 59
      //   => t³ > 1 - 59/height = 0.932  =>  t = 0.977  =>  391ms của 400ms
      statusTimer = setTimeout(() => setStatusDark(true), Math.round(OUT_SLIDE_MS * 0.977));
    }, delay);

    return () => {
      clearTimeout(t);
      if (statusTimer) clearTimeout(statusTimer);
    };
  }, [timelineDone, ready, error, reduceMotion, beat, height, v, onExitStart, onFinish, log, flushLog]);

  // --- Hình học -------------------------------------------------------------
  const logoW = width * LOGO_WIDTH_RATIO;
  const logoH = logoW * LOGO_RATIO;
  const glowD = logoW * GLOW_RATIO;
  const logoTop = height / 2 - logoH / 2;
  const taglineTop = logoTop + logoH + TAGLINE_GAP;

  // --- Nạp hỏng: lối thoát thay vì treo -------------------------------------
  if (error) {
    return (
      <View style={[styles.fill, styles.errorWrap]} onLayout={handleLayout}>
        <StatusBar style="light" />
        <Image
          source={require("../../../assets/brand/logo-mark-white.png")}
          style={{ width: logoW, height: logoH }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <T variant="heading" tone="white" style={styles.textCenter}>Chưa mở được ứng dụng</T>
        <T variant="small" tone="white" style={[styles.textCenter, styles.dim]}>{error}</T>
        {onRetry ? <Pill label="Thử lại" tone="paper" onPress={onRetry} style={styles.retry} /> : null}
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.fill, {
        opacity: v.screenOpacity,
        transform: [{ translateY: v.slideY }],
      }]}
      pointerEvents="none"
      onLayout={handleLayout}
    >
      <StatusBar style={statusDark ? "dark" : "light"} />

      {/* Cam PHẲNG = đúng nền native splash tại t=0. */}
      <View style={styles.flat} />

      {/* NHÓM nền JS: cam sẫm kín màn + gradient tròn, mờ vào như MỘT lớp.
          PNG dựng sẵn vì expo-linear-gradient không có radial.

          Vì sao phải gộp thành một nhóm thay vì cho mỗi lớp một `opacity`:
          ảnh tròn là hình VUÔNG cạnh width*1.7 (683pt trên iPhone 17 Pro) nên
          trên màn cao 874pt nó hở 95pt ở trên và dưới. Lớp cam sẫm mang đúng
          màu mép PNG (#B84A00) nên ở độ đục 0 và 1 thì không thấy ranh. Nhưng
          nếu HAI lớp cùng mờ riêng thì GIỮA CHỪNG, phần bên trong ô vuông bị
          hoà màu HAI LẦN còn bên ngoài chỉ một lần — đo trên video bản Release
          ở mốc 400ms: bậc 10–11 đơn vị tại đúng y=95.3pt và y=778.7pt. Gộp lại
          thì nhóm tự hoà bên trong ở độ đục đầy (không ranh vì hai màu bằng
          nhau), rồi cả nhóm hoà MỘT lần lên nền phẳng.

          Nền phẳng bên dưới giữ nguyên #E65C00: nó PHẢI bằng native splash
          tại t=0. */}
      <Animated.View style={[styles.fill, { zIndex: 0, opacity: v.bg }]}>
        <View style={styles.deep} />
        <Image
          source={require("../../../assets/splash/bg-radial.png")}
          style={[styles.abs, {
            width: width * 1.7, height: width * 1.7,
            left: width / 2 - width * 0.85,
            top: height / 2 - width * 0.85,
          }]}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      {/* Quầng sáng sau logo. Nở bằng `scale` chứ KHÔNG bằng width/height:
          width là thuộc tính layout, không chạy được trên UI thread. */}
      <Animated.Image
        source={require("../../../assets/splash/glow.png")}
        style={[styles.abs, {
          width: glowD, height: glowD,
          left: width / 2 - glowD / 2,
          top: height / 2 - glowD / 2,
          opacity: v.glowOpacity,
          transform: [{ scale: v.glowScale }],
        }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      {/* Logo: vị trí CỐ ĐỊNH, chỉ `scale` chạy. Bọc trong View căn giữa vì gán
          left/right thẳng lên node lá sẽ kéo nó rộng hết màn. */}
      <Animated.View
        style={[styles.centerRow, { top: logoTop, transform: [{ scale: v.logoScale }] }]}
      >
        <MaskedView
          style={{ width: logoW, height: logoH }}
          maskElement={
            <Image
              source={require("../../../assets/brand/logo-mark-white.png")}
              style={{ width: logoW, height: logoH }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          }
        >
          {/* Mask đã cắt theo hình logo, nên một mảng màu đặc CHÍNH LÀ logo. */}
          <View style={[StyleSheet.absoluteFill, styles.logoFill]} />
          {/* Dải sáng chạy ngang qua, nghiêng 20°. Cao gấp ba logo để hai đầu
              dải không lộ ra trong khung khi nghiêng. */}
          <Animated.View
            style={[styles.abs, {
              top: -logoH, bottom: -logoH, width: logoW * SHINE_W_RATIO,
              transform: [
                {
                  translateX: v.shineX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-logoW * 0.6, logoW * 1.6],
                  }),
                },
                { rotate: "20deg" },
              ],
            }]}
          >
            <LinearGradient
              colors={[color.whiteA(0), SHINE_COLOR, color.whiteA(0)]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </MaskedView>
      </Animated.View>

      {variant?.full ? (
        <Animated.View
          style={[styles.centerRow, {
            top: taglineTop,
            opacity: v.taglineOpacity,
            transform: [{ translateY: v.taglineY }],
          }]}
        >
          <T variant="bodyStrong" weight="medium" tone="white" style={styles.tagline}>
            {SPLASH_TAGLINE}
          </T>
        </Animated.View>
      ) : null}

      {showBar ? (
        <View style={[styles.barWrap, { bottom: height * 0.12 }]}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { transform: [{ scaleX: v.bar }] }]} />
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Cho nơi gọi kiểm lại rằng native splash và JS đang nói cùng một con số. */
export const SPLASH_NATIVE_LOGO_W = NATIVE_LOGO_W;

const styles = StyleSheet.create({
  fill: { ...ABSOLUTE_FILL, zIndex: 10 },
  flat: { ...ABSOLUTE_FILL, backgroundColor: color.bq },
  /** PHẢI bằng màu mép ngoài của bg-radial.png — xem chú thích nơi dùng. */
  deep: { ...ABSOLUTE_FILL, backgroundColor: color.bqDeep },
  abs: { position: "absolute" },
  centerRow: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  logoFill: { backgroundColor: color.white },
  tagline: { textAlign: "center", opacity: 0.9, letterSpacing: 0.2, maxWidth: 280 },
  dim: { opacity: 0.8 },
  textCenter: { textAlign: "center" },
  barWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  barTrack: {
    width: 64, height: 2, borderRadius: radius.pill,
    backgroundColor: color.whiteA(0.25), overflow: "hidden",
  },
  barFill: {
    width: "100%", height: 2, borderRadius: radius.pill, backgroundColor: color.white,
    transformOrigin: "left center",
  },
  errorWrap: {
    backgroundColor: color.bqDeep, alignItems: "center", justifyContent: "center",
    gap: space.x3, paddingHorizontal: space.x8,
  },
  retry: { marginTop: space.x4, alignSelf: "stretch" },
});
