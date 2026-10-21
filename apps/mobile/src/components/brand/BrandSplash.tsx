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

/** Bề rộng logo — PHẢI khớp `imageWidth` của expo-splash-screen trong app.json. */
const LOGO_W = 96;
/** Tỉ lệ cao/rộng của logo-mark-white.png. */
const LOGO_RATIO = 0.565;
const LOGO_H = LOGO_W * LOGO_RATIO;

/** Tagline cách đáy logo bấy nhiêu. */
const TAGLINE_GAP = 24;
/** Quầng sáng sau logo: đường kính ~2.5 lần bề rộng logo. */
const GLOW_D = LOGO_W * 2.5;

/**
 * Chỉ hiện thanh tiến độ khi nạp lâu hơn mốc này.
 *
 * Phần lớn lần mở app sẽ KHÔNG thấy thanh nào — một thanh chạy vụt qua trong
 * 300ms chỉ làm màn hình bận rộn chứ không cho người dùng thông tin gì.
 */
const BAR_AFTER_MS = 1500;

/**
 * Hai cách làm vệt sáng nổi trên logo TRẮNG.
 *
 * Trắng trên trắng thì không thấy gì, nên phải một trong hai: hạ logo gốc xuống
 * 0.85 trong lúc quét, hoặc đổi vệt sáng sang vàng kem. Dựng cả hai, chụp so
 * sánh rồi chốt — xem báo cáo.
 */
/**
 * Màu dải sáng lướt qua logo.
 *
 * ĐÃ THỬ CẢ HAI trên bản Release, cắt khung từ video (xem ab-shine):
 *  - trắng + hạ độ đục logo xuống 0.85 giữa lúc quét ("dim-logo"): dải hiện rõ
 *    hơn, nhưng cả khối logo chuyển kem xám đục suốt 400ms — mất trắng sạch của
 *    thương hiệu. Đo được: độ sáng logo tụt 251 -> 236.6.
 *  - kem phủ lên logo trắng (cách đang dùng): logo giữ trắng ở mọi khung, dải
 *    đọc ra như vệt sáng ấm lướt trên mặt trắng. Đo được: biên độ 4.9/255.
 *
 * Chọn cách thứ hai. KHÔNG quay lại trắng tinh: phủ trắng lên trắng thì không
 * thấy gì (đo trên nhánh SHORT, nơi không quét: biên độ 0.6/255 — tức bằng nhiễu).
 */
const SHINE_COLOR = color.bqShine;

/** Nhịp bản ĐẦY ĐỦ (lần mở đầu trong ngày), tổng ~1,8s. */
const FULL = {
  bg: { at: 0, dur: 500 },
  logo: { at: 100, dur: 600 },
  glow: { at: 100, dur: 700 },
  shine: { at: 500, dur: 600 },
  tagline: { at: 800, dur: 400 },
  hold: 1800,
} as const;

/** Nhịp bản NGẮN (các lần mở sau), tổng ~0,9s: bỏ vệt sáng và tagline. */
const SHORT = {
  bg: { at: 0, dur: 400 },
  logo: { at: 100, dur: 600 },
  glow: { at: 100, dur: 600 },
  hold: 900,
} as const;

/** Mờ vào khi bật Reduce Motion — xem lý do ở nhánh reduceMotion. */
const IN_REDUCED_MS = 260;
const OUT_MS = 350;
/** Thoát khi bật Reduce Motion: chỉ fade, dài hơn chút cho đỡ cộc. */
const OUT_REDUCED_MS = 400;

/**
 * masked-view 0.3.2 khai component theo kiểu class của React 18; với kiểu của
 * React 19 nó không còn hợp lệ làm JSX element ("missing setState, render...").
 * Ép kiểu tại MỘT chỗ thay vì rắc `as any` ở nơi dùng. Runtime không đổi.
 */
const MaskedView = MaskedViewRaw as unknown as React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  maskElement: React.ReactElement;
  children?: React.ReactNode;
}>;

/** RN 0.88 bỏ `StyleSheet.absoluteFillObject` khỏi kiểu; khai tường minh. */
const ABSOLUTE_FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

const STAMP_FILE = "bq-splash-last-open.txt";

/**
 * Hôm nay đã mở app lần nào chưa.
 *
 * `File.text()` của expo-file-system v58 là BẤT ĐỒNG BỘ nên không biết được
 * ngay lúc render đầu. Không sao: lời gọi này xong trong vài mili giây, còn
 * những bước PHÂN BIỆT hai bản (vệt sáng ở 500ms, tagline ở 800ms) thì mãi sau
 * mới tới. Hoạt cảnh chỉ khởi động khi đã biết, và khung tĩnh trước đó — cam
 * phẳng + logo giữa màn — vốn trùng khít native splash nên không ai thấy gì.
 *
 * Hỏng (web, quyền bị chặn) thì coi như lần đầu: thà xem hoạt cảnh đầy đủ còn
 * hơn vỡ splash.
 */
async function readIsFirstToday(): Promise<boolean> {
  try {
    const f = new File(Paths.document, STAMP_FILE);
    const today = new Date().toISOString().slice(0, 10);
    const seen = f.exists ? (await f.text()).trim() : "";
    if (seen !== today) {
      await f.write(today);
      return true;
    }
    return false;
  } catch {
    return true;
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
  /** Gọi khi splash đã vẽ xong khung đầu; nơi gọi dùng để gỡ native splash. */
  onReadyToReveal?: () => void;
  /** Gọi ở thời điểm BẮT ĐẦU thoát, để màn đích hiện vào cùng nhịp. */
  onExitStart?: () => void;
  /** Gọi khi splash đã mờ hẳn; nơi gọi gỡ component khỏi cây. */
  onFinish: () => void;
}

/**
 * Màn mở đầu: logo BQ trên nền cam. Không còn ảnh sản phẩm.
 *
 * Logo đứng CỐ ĐỊNH giữa màn, đúng chỗ và đúng cỡ native splash đặt nó — chỉ có
 * `scale` nở ra rồi về, KHÔNG có chuyển động vị trí, nên chuyển giao native → JS
 * không xê dịch một pixel nào.
 */
export function BrandSplash({
  ready, progress, error, onRetry, onReadyToReveal, onExitStart, onFinish,
}: BrandSplashProps) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [showBar, setShowBar] = useState(false);
  const mountedAt = useRef<number | null>(null);

  // null = chưa biết; hoạt cảnh chờ biết rồi mới chạy (xem readIsFirstToday).
  const [isFull, setIsFull] = useState<boolean | null>(null);
  const beat = isFull === false ? SHORT : FULL;

  const v = useMemo(() => ({
    bg: new Animated.Value(0),
    logoScale: new Animated.Value(1),
    glow: new Animated.Value(0),
    shineX: new Animated.Value(0),
    taglineOpacity: new Animated.Value(0),
    taglineY: new Animated.Value(6),
    screenOpacity: new Animated.Value(1),
    screenScale: new Animated.Value(1),
    bar: new Animated.Value(0),
  }), []);

  // Gỡ native splash chỉ khi khung đầu đã vẽ — gỡ sớm hơn sẽ lộ nền root.
  const revealed = useRef(false);
  const handleLayout = useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    onReadyToReveal?.();
  }, [onReadyToReveal]);

  useEffect(() => {
    mountedAt.current = Date.now();
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
    void readIsFirstToday().then(setIsFull);
  }, []);

  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setShowBar(true), BAR_AFTER_MS);
    return () => clearTimeout(t);
  }, [ready]);

  // --- Hoạt cảnh vào ---
  useEffect(() => {
    if (reduceMotion === null || isFull === null) return;

    if (reduceMotion) {
      // Reduce Motion: không nở, không quét, không trượt — nhưng VẪN mờ dần.
      //
      // Bản trước dùng setValue() cho cả ba giá trị. Đo trên video bản Release:
      // quầng sáng nhảy từ (215,84,0) lên (242,126,37) và tagline từ 0 lên 3800
      // pixel trong ĐÚNG MỘT khung, ở mốc +117ms — là lúc hai lời hứa bất đồng
      // bộ (isReduceMotionEnabled + readIsFirstToday) trả về. Người dùng thấy
      // logo nằm trên nền cam phẳng một nhịp rồi mọi thứ bật ra cùng lúc. Đúng
      // nhóm người dùng không nên gặp thay đổi đột ngột lại gặp cú bật duy nhất
      // của cả màn splash.
      //
      // Mờ dần KHÔNG phải chuyển động: nó chính là thứ Apple khuyến nghị dùng
      // thay cho chuyển động khi bật Reduce Motion, và lối thoát của màn này
      // (OUT_REDUCED_MS) vốn đã mờ dần rồi — giờ hai đầu mới nhất quán.
      Animated.parallel([
        Animated.timing(v.bg, {
          toValue: 1, duration: IN_REDUCED_MS, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v.glow, {
          toValue: 0.444, duration: IN_REDUCED_MS, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v.taglineOpacity, {
          toValue: isFull === true ? 1 : 0, duration: IN_REDUCED_MS,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
      ]).start();
      v.taglineY.setValue(0);          // không trượt lên: đó mới là chuyển động
      return;
    }

    const seq: Animated.CompositeAnimation[] = [
      Animated.sequence([
        Animated.delay(beat.bg.at),
        Animated.timing(v.bg, {
          toValue: 1, duration: beat.bg.dur, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(beat.logo.at),
        Animated.timing(v.logoScale, {
          toValue: 1.06, duration: beat.logo.dur / 2, easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(v.logoScale, {
          toValue: 1, duration: beat.logo.dur / 2, easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Quầng sáng 0 -> 0.18 -> 0.08. Đỉnh 0.18 nướng sẵn trong PNG nên giá trị ở
      // đây chạy 0 -> 1 -> 0.444 (= 0.08/0.18).
      Animated.sequence([
        Animated.delay(beat.glow.at),
        Animated.timing(v.glow, {
          toValue: 1, duration: beat.glow.dur * 0.57, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v.glow, {
          toValue: 0.444, duration: beat.glow.dur * 0.43, easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ];

    if (isFull === true) {
      const f = FULL;
      seq.push(
        Animated.sequence([
          Animated.delay(f.shine.at),
          Animated.parallel([
            Animated.timing(v.shineX, {
              toValue: 1, duration: f.shine.dur, easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(f.tagline.at),
          Animated.parallel([
            Animated.timing(v.taglineOpacity, {
              toValue: 1, duration: f.tagline.dur, easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(v.taglineY, {
              toValue: 0, duration: f.tagline.dur, easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    }

    Animated.parallel(seq).start();
  }, [reduceMotion, isFull, beat, v]);

  // --- Thanh tiến độ bám tiến độ nạp THẬT ---
  useEffect(() => {
    Animated.timing(v.bar, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 220,
      easing: Easing.out(Easing.quad),
      // scaleX chạy trên UI thread; `width` thì không.
      useNativeDriver: true,
    }).start();
  }, [progress, v.bar]);

  // --- Thoát: muộn hơn trong hai mốc — hết timeline, và nạp xong ---
  useEffect(() => {
    if (!ready || error) return;
    const since = mountedAt.current ?? Date.now();
    const delay = Math.max(0, beat.hold - (Date.now() - since));
    const t = setTimeout(() => {
      onExitStart?.();
      if (reduceMotion) {
        Animated.timing(v.screenOpacity, {
          toValue: 0, duration: OUT_REDUCED_MS, easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }).start(() => onFinish());
        return;
      }
      Animated.parallel([
        Animated.timing(v.screenScale, {
          toValue: 1.04, duration: OUT_MS, easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(v.screenOpacity, {
          toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        // Gỡ ở frame SAU: unmount cây view ngay trong khung cuối sẽ cướp frame đó.
        requestAnimationFrame(() => onFinish());
      });
    }, delay);
    return () => clearTimeout(t);
  }, [ready, error, reduceMotion, beat, v, onExitStart, onFinish]);

  // --- Nạp hỏng: lối thoát thay vì treo ---
  if (error) {
    return (
      <View style={[styles.fill, styles.errorWrap]} onLayout={handleLayout}>
        <StatusBar style="light" />
        <Image
          source={require("../../../assets/brand/logo-mark-white.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <T variant="heading" tone="white" style={styles.textCenter}>Chưa mở được ứng dụng</T>
        <T variant="small" tone="white" style={[styles.textCenter, styles.dim]}>{error}</T>
        {onRetry ? <Pill label="Thử lại" tone="paper" onPress={onRetry} style={styles.retry} /> : null}
      </View>
    );
  }

  // --- Hình học: logo CỐ ĐỊNH giữa màn, khớp native splash ---
  const logoTop = height / 2 - LOGO_H / 2;
  const taglineTop = logoTop + LOGO_H + TAGLINE_GAP;
  const glowTop = height / 2 - GLOW_D / 2;

  return (
    <Animated.View
      style={[styles.fill, {
        opacity: v.screenOpacity,
        transform: [{ scale: v.screenScale }],
      }]}
      pointerEvents="none"
      onLayout={handleLayout}
    >
      <StatusBar style="light" />

      {/* Cam PHẲNG = đúng nền native splash tại t=0. */}
      <View style={styles.flat} />

      {/* Lớp cam SẪM trải kín màn, mờ vào cùng nhịp với ảnh tròn.
          Ảnh tròn là hình VUÔNG cạnh width*1.7 (683pt trên iPhone 17 Pro) nên
          trên màn cao 874pt nó hở 95pt ở trên và dưới; mép PNG là #B84A00 còn
          nền phẳng là #E65C00 => một bậc màu cứng 47 đơn vị chạy ngang màn, đo
          được ở y=95.3pt và y=778.7pt. Không sửa bằng cách đổi màu nền phẳng:
          nền phẳng PHẢI bằng đúng native splash tại t=0. Lớp này mang đúng màu
          mép PNG nên bậc biến mất, mà lúc v.bg = 0 toàn màn vẫn là #E65C00. */}
      <Animated.View style={[styles.deep, { opacity: v.bg }]} />

      {/* Radial gradient nở lên trên nền phẳng. PNG dựng sẵn vì
          expo-linear-gradient không có radial; gradient co giãn không vỡ. */}
      <Animated.Image
        source={require("../../../assets/splash/bg-radial.png")}
        style={[styles.abs, {
          width: width * 1.7, height: width * 1.7,
          left: width / 2 - width * 0.85,
          top: height / 2 - width * 0.85,
          opacity: v.bg,
        }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      {/* Quầng sáng sau logo. */}
      <Animated.Image
        source={require("../../../assets/splash/glow.png")}
        style={[styles.abs, {
          width: GLOW_D, height: GLOW_D,
          left: width / 2 - GLOW_D / 2,
          top: glowTop,
          opacity: v.glow,
        }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      {/* Logo: vị trí CỐ ĐỊNH, chỉ nở bằng scale. Bọc trong View căn giữa vì gán
          left/right thẳng lên node lá sẽ kéo nó rộng hết màn. */}
      <Animated.View
        style={[styles.centerRow, { top: logoTop, transform: [{ scale: v.logoScale }] }]}
      >
        <MaskedView
          style={styles.logo}
          maskElement={
            <Image
              source={require("../../../assets/brand/logo-mark-white.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          }
        >
          {/* Mask đã cắt theo hình logo, nên một mảng màu đặc CHÍNH LÀ logo. */}
          <View style={[StyleSheet.absoluteFill, styles.logoFill]} />
          {/* Dải sáng chạy ngang qua, nghiêng 20°. Cao gấp ba logo để hai đầu dải
              không lộ ra trong khung khi nghiêng. */}
          <Animated.View
            style={[styles.shine, {
              width: LOGO_W * 0.4,
              transform: [
                {
                  translateX: v.shineX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-LOGO_W * 0.6, LOGO_W * 1.6],
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

      {isFull === true ? (
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

const styles = StyleSheet.create({
  fill: { ...ABSOLUTE_FILL, zIndex: 10 },
  flat: { ...ABSOLUTE_FILL, backgroundColor: color.bq },
  /** PHẢI bằng màu mép ngoài của bg-radial.png — xem chú thích nơi dùng. */
  deep: { ...ABSOLUTE_FILL, backgroundColor: color.bqDeep },
  abs: { position: "absolute" },
  centerRow: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  logo: { width: LOGO_W, height: LOGO_H },
  logoFill: { backgroundColor: color.white },
  shine: { position: "absolute", top: -LOGO_H, bottom: -LOGO_H },
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
