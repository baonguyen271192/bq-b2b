import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { color, radius, space } from "@/theme";
import { Pill, T } from "../ui";

/**
 * Slogan đầy đủ của BQ, do phía BQ cung cấp:
 *
 *   "Giày BQ đồng hành cùng khách hàng công sở với chất lượng cao,
 *    trải nghiệm tự tin trên mọi hành trình."
 *
 * Trên splash chỉ dùng VẾ CUỐI: bản đầy đủ ~95 ký tự, ở cỡ 15 sẽ xuống 4 dòng và
 * nuốt mất chiếc giày — thứ đáng là nhân vật chính ở màn này. Bản đầy đủ để dành
 * cho chỗ có không gian (màn Hồ sơ, trang giới thiệu).
 */
export const BQ_SLOGAN_FULL =
  "Giày BQ đồng hành cùng khách hàng công sở với chất lượng cao, "
  + "trải nghiệm tự tin trên mọi hành trình.";
const SPLASH_TAGLINE = "Tự tin trên mọi hành trình";

/** Bề rộng logo — PHẢI khớp `imageWidth` của expo-splash-screen trong app.json. */
const LOGO_W = 96;
/** Tỉ lệ cao/rộng của logo-mark-white.png. */
const LOGO_RATIO = 0.565;
/** Tỉ lệ cao/rộng của shoe.png (678x400). */
const SHOE_RATIO = 0.59;

/** Bố cục tính theo % chiều cao VÙNG AN TOÀN, không phải % màn hình thô. */
const LAYOUT = {
  logoCenter: 0.28,
  shoeCenter: 0.52,
  shoeWidth: 0.84,
  barBottom: 0.12,
} as const;

/**
 * Khoảng cách tối thiểu từ đáy logo tới đỉnh giày.
 *
 * Trên màn ngắn (iPhone SE 375x667) hai tỉ lệ 28% và 52% chỉ cách nhau ~35px —
 * logo và giày dính vào nhau. Khi đó kéo LOGO lên cho đủ 48px thay vì bóp giày:
 * giày là nhân vật chính của màn này.
 */
const MIN_LOGO_SHOE_GAP = 48;

/** Khoảng cách từ đáy bóng tới tagline. */
const TAGLINE_OFFSET = 28;

/** Nhịp hoạt cảnh, tổng ~1,6s. */
const BEAT = {
  logo: 350,
  glowDelay: 150, glow: 450,
  shoeDelay: 250, shoe: 650,
  taglineDelay: 700, tagline: 300,
} as const;

/** Giữ splash tối thiểu bấy nhiêu, kể cả khi nạp xong sớm. */
const MIN_MS = 1600;
/** Thời lượng mờ dần khi đóng. */
const OUT_MS = 250;

/** RN 0.88 bỏ `StyleSheet.absoluteFillObject` khỏi kiểu; khai tường minh. */
const ABSOLUTE_FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

export interface BrandSplashProps {
  /** Đã nạp xong mọi thứ cần thiết chưa. */
  ready: boolean;
  /** Tiến độ nạp THẬT, 0…1. Không phải đồng hồ đếm giả. */
  progress: number;
  /** Nạp hỏng — splash nhường chỗ cho màn lỗi, KHÔNG treo ở vòng xoay. */
  error?: string | null;
  onRetry?: () => void;
  /** Gọi khi splash đã mờ hẳn; nơi gọi gỡ component khỏi cây. */
  onFinish: () => void;
}

/**
 * Màn mở đầu có hoạt cảnh, nối liền native splash.
 *
 * Khung ĐẦU TIÊN đặt logo chính giữa màn — đúng chỗ native splash đặt nó, vì
 * expo-splash-screen chỉ căn giữa được — rồi mới animate lên vị trí 28%.
 *
 * Dùng `Animated` của React Native thay vì reanimated: mọi chuyển động ở đây là
 * opacity/translate/rotate/scale nên chạy được với `useNativeDriver` — cùng trên
 * UI thread, cùng độ mượt — mà không phải dựa vào babel plugin của reanimated,
 * thứ chưa từng được dùng ở đâu trong repo này nên chưa ai xác minh.
 */
export function BrandSplash({ ready, progress, error, onRetry, onFinish }: BrandSplashProps) {
  // useWindowDimensions thay cho Dimensions.get(): hàm kia không thuần nên gọi
  // trong render bị chặn, và nó cũng không cập nhật khi xoay máy.
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  // Mốc thời gian ghi trong effect, KHÔNG trong render: Date.now() không thuần.
  const mountedAt = useRef<number | null>(null);

  const v = useMemo(() => ({
    logoY: new Animated.Value(0),      // 0 = giữa màn (khớp native), 1 = vị trí cuối
    glow: new Animated.Value(0),
    shoeX: new Animated.Value(56),
    shoeOpacity: new Animated.Value(0),
    shadowScale: new Animated.Value(0.6),
    taglineOpacity: new Animated.Value(0),
    screenOpacity: new Animated.Value(1),
    bar: new Animated.Value(0),
  }), []);

  useEffect(() => {
    mountedAt.current = Date.now();
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  // --- Hoạt cảnh vào ---
  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      // Tôn trọng Reduce Motion: hiện thẳng ở trạng thái cuối, không trượt.
      v.logoY.setValue(1); v.glow.setValue(1); v.shoeX.setValue(0);
      v.shoeOpacity.setValue(1); v.shadowScale.setValue(1); v.taglineOpacity.setValue(1);
      return;
    }

    const ease = Easing.out(Easing.cubic);
    Animated.parallel([
      Animated.timing(v.logoY, {
        toValue: 1, duration: BEAT.logo, easing: ease, useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(BEAT.glowDelay),
        Animated.timing(v.glow, {
          toValue: 1, duration: BEAT.glow, easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(BEAT.shoeDelay),
        Animated.parallel([
          Animated.timing(v.shoeX, {
            toValue: 0, duration: BEAT.shoe, easing: ease, useNativeDriver: true,
          }),
          // Ảnh hiện nhanh hơn chuyển động: giày bán trong suốt trên nền cam ra
          // màu nâu bẩn, kéo dài làm người xem tưởng ảnh sai màu.
          Animated.timing(v.shoeOpacity, {
            toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          // Bóng CHỈ phình ra và hiện dần, KHÔNG trượt theo giày: bóng nằm trên
          // mặt sàn, mà sàn thì không di chuyển.
          Animated.timing(v.shadowScale, {
            toValue: 1, duration: BEAT.shoe, easing: ease, useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(BEAT.taglineDelay),
        Animated.timing(v.taglineOpacity, {
          toValue: 1, duration: BEAT.tagline, easing: ease, useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [reduceMotion, v]);

  // --- Thanh tiến độ bám tiến độ nạp THẬT ---
  useEffect(() => {
    Animated.timing(v.bar, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 220,
      easing: Easing.out(Easing.quad),
      // scaleX chạy được trên UI THREAD; `width` thì không. Bản trước animate
      // width và nó giật thấy rõ — mỗi khung của thanh này phải đi qua JS thread,
      // đúng lúc JS thread đang bận mount màn phía dưới splash.
      useNativeDriver: true,
    }).start();
  }, [progress, v.bar]);

  // --- Hoạt cảnh ra ---
  useEffect(() => {
    if (!ready || error) return;
    const since = mountedAt.current ?? Date.now();
    const delay = Math.max(0, MIN_MS - (Date.now() - since));
    const t = setTimeout(() => {
      const fade = Animated.timing(v.screenOpacity, {
        toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true,
      });
      if (reduceMotion) {
        fade.start(() => onFinish());
        return;
      }
      Animated.parallel([
        Animated.timing(v.shoeX, { toValue: -40, duration: OUT_MS, useNativeDriver: true }),
        fade,
      ]).start(() => onFinish());
    }, delay);
    return () => clearTimeout(t);
  }, [ready, error, reduceMotion, v, onFinish]);

  // --- Nạp hỏng: hiện lối thoát thay vì treo ---
  if (error) {
    return (
      <View style={[styles.fill, styles.errorWrap]}>
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

  // --- Hình học, tính trong VÙNG AN TOÀN ---
  const safeTop = insets.top;
  const safeH = height - insets.top - insets.bottom;

  const logoH = LOGO_W * LOGO_RATIO;
  const shoeW = width * LAYOUT.shoeWidth;
  const shoeH = shoeW * SHOE_RATIO;
  const shoeTop = safeTop + safeH * LAYOUT.shoeCenter - shoeH / 2;

  // Vị trí logo mong muốn, và mức trần do khoảng hở tối thiểu áp đặt.
  const logoWanted = safeTop + safeH * LAYOUT.logoCenter - logoH / 2;
  const logoCap = shoeTop - MIN_LOGO_SHOE_GAP - logoH;
  const logoFinalTop = Math.min(logoWanted, logoCap);
  // Khung đầu tiên: chính giữa màn, khớp native splash.
  const logoStartTop = height / 2 - logoH / 2;

  const shadowW = shoeW * 0.7;
  const shadowH = shoeW * 0.06;
  // Bóng nằm ngay dưới đế. Giày nghiêng 6° nên điểm thấp nhất lệch về phía gót,
  // nhưng bóng trên sàn vẫn là elip NẰM NGANG — nghiêng theo giày sẽ thành như
  // giày dán trên một mặt phẳng nghiêng.
  const shadowTop = shoeTop + shoeH - shadowH * 0.6;

  const taglineTop = shadowTop + shadowH + TAGLINE_OFFSET;
  const barBottom = insets.bottom + safeH * LAYOUT.barBottom;
  const glowSize = width * 0.9;

  return (
    <Animated.View style={[styles.fill, { opacity: v.screenOpacity }]} pointerEvents="none">
      <StatusBar style="light" />

      {/* Nền phẳng màu rìa gradient: lấp bốn góc mà ảnh radial không phủ tới. */}
      <View style={styles.flat} />

      {/* Radial gradient dựng sẵn thành PNG: expo-linear-gradient KHÔNG có radial,
          và gradient thì co giãn không thấy vỡ. Tâm đặt sau giày. */}
      <Image
        source={require("../../../assets/splash/bg-radial.png")}
        style={[styles.abs, {
          width: width * 1.7, height: width * 1.7,
          left: width / 2 - width * 0.85,
          top: shoeTop + shoeH / 2 - width * 0.85,
        }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      {/* Vùng sáng tròn sau giày — thứ làm giày "nổi" lên khỏi nền. */}
      <Animated.Image
        source={require("../../../assets/splash/glow.png")}
        style={[styles.abs, {
          width: glowSize, height: glowSize,
          left: width / 2 - glowSize / 2,
          top: shoeTop + shoeH / 2 - glowSize / 2,
          opacity: v.glow,
        }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      {/* Logo nằm trong một View căn giữa, KHÔNG gán left/right thẳng lên Image:
          chúng kéo ảnh rộng hết màn và đá nhau với width, còn alignItems thì
          không có tác dụng lên node lá — logo sẽ dính mép trái. */}
      <Animated.View
        style={[styles.centerRow, {
          top: logoStartTop,
          transform: [{
            translateY: v.logoY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, logoFinalTop - logoStartTop],
            }),
          }],
        }]}
      >
        <Image
          source={require("../../../assets/brand/logo-mark-white.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      {/* Bóng vẽ TRƯỚC giày để nằm dưới. PNG radial thay cho react-native-svg
          (repo chưa có) và thay cho View + shadow* (iOS/Android vẽ khác nhau). */}
      <Animated.Image
        source={require("../../../assets/splash/shadow.png")}
        style={[styles.abs, {
          width: shadowW, height: shadowH,
          left: width / 2 - shadowW / 2,
          top: shadowTop,
          opacity: v.shoeOpacity,
          transform: [{ scale: v.shadowScale }],
        }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      <Animated.View style={[styles.centerRow, { top: shoeTop }]}>
        <Animated.Image
          source={require("../../../assets/splash/shoe.png")}
          style={[
            { width: shoeW, height: shoeH },
            {
              opacity: v.shoeOpacity,
              transform: [{ translateX: v.shoeX }, { rotate: "-6deg" }],
            },
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>

      <Animated.View style={[styles.centerRow, { top: taglineTop, opacity: v.taglineOpacity }]}>
        {/* KHÔNG lặp lại wordmark "BQ" ở đây: logo phía trên ĐÃ là hai chữ đó. */}
        <T variant="bodyStrong" weight="medium" tone="white" style={styles.tagline}>
          {SPLASH_TAGLINE}
        </T>
      </Animated.View>

      <View style={[styles.barWrap, { bottom: barBottom }]}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { transform: [{ scaleX: v.bar }] }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { ...ABSOLUTE_FILL, zIndex: 10 },
  flat: { ...ABSOLUTE_FILL, backgroundColor: color.bqDeep },
  abs: { position: "absolute" },
  centerRow: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  barWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  logo: { width: LOGO_W, height: LOGO_W * LOGO_RATIO },
  tagline: {
    textAlign: "center",
    opacity: 0.9,
    letterSpacing: 0.2,
    // Bó chiều ngang để câu xuống dòng ở chỗ dễ đọc thay vì sát mép màn.
    maxWidth: 280,
  },
  dim: { opacity: 0.8 },
  textCenter: { textAlign: "center" },
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
