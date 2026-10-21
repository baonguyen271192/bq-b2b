import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { color, radius, space } from "@/theme";
import { Pill, T } from "../ui";

/** RN 0.88 bỏ `StyleSheet.absoluteFillObject` khỏi kiểu; khai tường minh. */
const ABSOLUTE_FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Logo rộng 120 — PHẢI khớp `imageWidth` của expo-splash-screen trong app.json. */
const LOGO_W = 120;
/** Tỉ lệ cao/rộng của logo-mark-white.png (1024x579). */
const LOGO_RATIO = 0.565;
/**
 * Vị trí cuối của logo, tính theo tỉ lệ chiều cao màn.
 *
 * Khung ĐẦU TIÊN phải đặt logo đúng chỗ native splash đặt nó — tức CHÍNH GIỮA
 * màn hình — nếu không, lúc JS tiếp quản logo nhảy một phát nhìn thấy rõ. Nên
 * quãng trượt không phải con số chọn bằng mắt mà là khoảng cách từ giữa màn tới
 * đây. (Bản thiết kế ghi "khoảng 40px"; 40px không đủ để logo thoát khỏi chiếc
 * giày đặt giữa màn, nên lấy ràng buộc "khớp native splash" làm chuẩn.)
 */
const LOGO_TOP_RATIO = 0.26;
/** Tâm chiếc giày, theo tỉ lệ chiều cao màn. */
const SHOE_CENTER_RATIO = 0.47;
/** Đỉnh khối wordmark, theo tỉ lệ chiều cao màn. */
const WORD_TOP_RATIO = 0.645;

/**
 * Nhịp hoạt cảnh.
 *
 * Bản đầu dùng 300/700/500ms và tổng 1,2s — xem thật thì GẤP: ba lớp chồng lên
 * nhau gần như cùng lúc nên mắt không kịp đọc lớp nào. Giãn ra, và cho mỗi lớp
 * khởi động lệch nhau đủ xa để thành một chuỗi chứ không thành một đống.
 */
const BEAT = {
  glow: 520,
  shoeDelay: 260,
  shoe: 900,
  wordDelay: 820,
  word: 600,
} as const;

/**
 * Slogan đầy đủ của BQ, do phía BQ cung cấp:
 *
 *   "Giày BQ đồng hành cùng khách hàng công sở với chất lượng cao,
 *    trải nghiệm tự tin trên mọi hành trình."
 *
 * Trên splash chỉ dùng VẾ CUỐI: bản đầy đủ ~95 ký tự, ở cỡ `small` sẽ xuống 4
 * dòng và nuốt mất chiếc giày — thứ đáng là nhân vật chính ở màn này. Bản đầy
 * đủ để dành cho chỗ có không gian (màn Hồ sơ, trang giới thiệu).
 */
export const BQ_SLOGAN_FULL =
  "Giày BQ đồng hành cùng khách hàng công sở với chất lượng cao, "
  + "trải nghiệm tự tin trên mọi hành trình.";
const SPLASH_TAGLINE = "Tự tin trên mọi hành trình";

/** Giữ splash tối thiểu bấy nhiêu, kể cả khi nạp xong sớm. */
const MIN_MS = 2300;
/** Thời lượng mờ dần khi đóng. */
const OUT_MS = 420;

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
 * Cảnh đầu tiên trùng khít native splash (cùng nền `bq`, logo cùng bề rộng 120,
 * cùng căn giữa) nên lúc JS tiếp quản không thấy logo nhảy chỗ.
 *
 * Dùng `Animated` của React Native thay vì reanimated: mọi chuyển động ở đây là
 * opacity/translate/rotate nên chạy được với `useNativeDriver` — cùng trên UI
 * thread, cùng độ mượt — mà không phải dựa vào babel plugin của reanimated,
 * thứ chưa từng được dùng ở đâu trong repo này nên chưa ai xác minh.
 */
export function BrandSplash({ ready, progress, error, onRetry, onFinish }: BrandSplashProps) {
  // useWindowDimensions thay cho Dimensions.get(): hàm kia không thuần nên gọi
  // trong render bị chặn, và nó cũng không cập nhật khi xoay máy.
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  // Mốc thời gian ghi trong effect, KHÔNG trong render: Date.now() không thuần.
  const mountedAt = useRef<number | null>(null);

  const v = useMemo(() => ({
    glow: new Animated.Value(0),
    logoY: new Animated.Value(0),   // 0 = giữa màn (khớp native), 1 = vị trí cuối
    shoeX: new Animated.Value(60),
    shoeOpacity: new Animated.Value(0),
    shoeRot: new Animated.Value(0),
    shoeScale: new Animated.Value(0.9),
    wordOpacity: new Animated.Value(0),
    wordY: new Animated.Value(12),
    screenOpacity: new Animated.Value(1),
    // Thanh tiến độ nằm CHUNG useMemo: đọc `.current` của useRef ngay trong
    // render là truy cập ref lúc render, lint chặn đúng.
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
      // Tôn trọng Reduce Motion: hiện thẳng, không trượt, không xoay.
      v.glow.setValue(1); v.shoeOpacity.setValue(1); v.shoeX.setValue(0);
      v.shoeRot.setValue(1); v.shoeScale.setValue(1);
      v.wordOpacity.setValue(1); v.wordY.setValue(0);
      v.logoY.setValue(1);
      return;
    }

    const ease = Easing.out(Easing.cubic);
    Animated.parallel([
      Animated.timing(v.glow, { toValue: 1, duration: BEAT.glow, easing: ease, useNativeDriver: true }),
      Animated.timing(v.logoY, { toValue: 1, duration: BEAT.glow, easing: ease, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(BEAT.shoeDelay),
        Animated.parallel([
          Animated.timing(v.shoeX, { toValue: 0, duration: BEAT.shoe, easing: ease, useNativeDriver: true }),
          // Ảnh hiện nhanh hơn chuyển động: giày bán trong suốt trên nền cam ra
          // màu nâu bẩn, kéo dài làm người xem tưởng ảnh sai màu.
          Animated.timing(v.shoeOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v.shoeRot, { toValue: 1, duration: BEAT.shoe, easing: ease, useNativeDriver: true }),
          Animated.timing(v.shoeScale, { toValue: 1, duration: BEAT.shoe, easing: ease, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(BEAT.wordDelay),
        Animated.parallel([
          Animated.timing(v.wordOpacity, { toValue: 1, duration: BEAT.word, easing: ease, useNativeDriver: true }),
          Animated.timing(v.wordY, { toValue: 0, duration: BEAT.word, easing: ease, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [reduceMotion, v]);

  // --- Thanh tiến độ bám tiến độ nạp THẬT ---
  useEffect(() => {
    Animated.timing(v.bar, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 220,
      easing: Easing.out(Easing.quad),
      // scaleX chạy được trên UI THREAD; `width` thì không. Bản đầu animate
      // width và nó giật thấy rõ — mỗi khung của thanh này phải đi qua JS
      // thread, đúng lúc JS thread đang bận mount màn phía dưới splash.
      // `transformOrigin: left` giữ thanh mọc từ trái, và vì phần chạy là một
      // khối đặc bo tròn hai đầu nên scaleX không làm méo bo góc nhìn thấy được.
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
        Animated.timing(v.shoeX, { toValue: -80, duration: OUT_MS, useNativeDriver: true }),
        Animated.timing(v.shoeOpacity, { toValue: 0, duration: OUT_MS, useNativeDriver: true }),
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

  const shoeW = width * 0.78;

  return (
    <Animated.View style={[styles.fill, { opacity: v.screenOpacity }]} pointerEvents="none">
      <StatusBar style="light" />

      {/* Nền phẳng màu bq = đúng cảnh native splash tại t=0 */}
      <View style={styles.flat} />

      {/* Xấp xỉ radial gradient: expo-linear-gradient KHÔNG có radial, nên dùng
          một gradient chéo cộng một quầng tròn sáng ở giữa. Đủ ở khổ điện thoại;
          muốn radial thật phải thêm react-native-svg. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.glow }]}>
        <LinearGradient
          colors={[color.bq, color.bqDeep]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Quầng sáng giữa màn.
            Đã thử hai cách trước và cả hai đều lộ lỗi khi chụp: một hình tròn đặc
            cho mép CỨNG; năm vòng đồng tâm cho SỌC nhìn thấy được. Cách này dùng
            một gradient dọc trong suốt→sáng→trong suốt, nên chuyển màu mượt thật
            chứ không phải xấp xỉ bằng các lớp.
            Đây KHÔNG phải radial đúng nghĩa (sáng theo dải ngang thay vì theo
            vòng); radial thật cần react-native-svg, không đáng thêm một thư viện
            native chỉ để vẽ một quầng. */}
        <LinearGradient
          colors={[color.whiteA(0), color.bqBright, color.whiteA(0)]}
          locations={[0, 0.46, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glowBand]}
        />
      </Animated.View>

      {/* Ba khối định vị TUYỆT ĐỐI theo tỉ lệ màn hình, không xếp theo flex: xếp
          flex thì chiếc giày (dù opacity 0) vẫn chiếm chỗ và đẩy logo lên cao,
          làm khung đầu tiên lệch khỏi native splash. */}
      {/* Logo nằm trong một View căn giữa, KHÔNG gán absCenterX thẳng lên Image:
          `left: 0 + right: 0` kéo ảnh rộng hết màn và đá nhau với `width: 120`,
          còn `alignItems` thì không có tác dụng lên node lá — kết quả là logo
          dính sát mép trái và cụt mất nét chữ B. */}
      <Animated.View
        style={[styles.absCenterX, {
          // Vị trí tĩnh = CHÍNH GIỮA màn, khớp native splash.
          top: height / 2 - (LOGO_W * LOGO_RATIO) / 2,
          transform: [{
            translateY: v.logoY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, height * LOGO_TOP_RATIO - (height / 2 - (LOGO_W * LOGO_RATIO) / 2)],
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

      <View style={[styles.absCenterX, { top: height * SHOE_CENTER_RATIO - (shoeW * 0.545) / 2 }]}>
        {/* Bóng elip để RỜI khỏi giày: gắn chung sẽ nghiêng theo lúc giày xoay,
            trông như bóng bị lệch khỏi mặt sàn. */}
        {/* Hai lớp bóng: một lớp rộng mờ làm vùng toả, một lớp hẹp đậm làm điểm
            tiếp đất. Một viên thuốc phẳng trông như miếng dán dưới giày. */}
        <Animated.View
          style={[styles.shadowSoft, { width: shoeW * 0.82, opacity: v.shoeOpacity }]}
        />
        <Animated.View
          style={[styles.shadowCore, { width: shoeW * 0.62, opacity: v.shoeOpacity }]}
        />
        <Animated.Image
          source={require("../../../assets/splash/shoe.png")}
          style={[
            { width: shoeW, height: shoeW * 0.545 },
            {
              opacity: v.shoeOpacity,
              transform: [
                { translateX: v.shoeX },
                {
                  rotate: v.shoeRot.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["-8deg", "-4deg"],
                  }),
                },
                { scale: v.shoeScale },
              ],
            },
          ]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>

      <Animated.View
        style={[styles.word, styles.absCenterX, {
          top: height * WORD_TOP_RATIO,
          opacity: v.wordOpacity,
          transform: [{ translateY: v.wordY }],
        }]}
      >
        {/* KHÔNG lặp lại wordmark "BQ" ở đây: logo phía trên ĐÃ là hai chữ đó,
            nên một chữ BQ thứ hai không thêm thông tin, chỉ thêm nhiễu. */}
        <T variant="bodyStrong" tone="white" style={styles.tagline}>
          {SPLASH_TAGLINE}
        </T>
      </Animated.View>

      <View style={[styles.barWrap, { bottom: height * 0.15 }]}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { transform: [{ scaleX: v.bar }] }]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { ...ABSOLUTE_FILL, zIndex: 10 },
  flat: { ...ABSOLUTE_FILL, backgroundColor: color.bq },
  glowBand: { opacity: 0.45 },
  logo: { width: LOGO_W, height: LOGO_W * LOGO_RATIO },
  absCenterX: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  shadowSoft: {
    position: "absolute", bottom: 2, height: 22,
    borderRadius: radius.pill, backgroundColor: color.blackA(0.07),
  },
  shadowCore: {
    position: "absolute", bottom: 10, height: 14,
    borderRadius: radius.pill, backgroundColor: color.blackA(0.22),
  },
  word: { alignItems: "center" },
  tagline: {
    textAlign: "center",
    opacity: 0.92,
    // Bó chiều ngang để câu xuống dòng ở chỗ dễ đọc thay vì sát mép màn.
    maxWidth: 260,
    letterSpacing: 0.2,
  },
  dim: { opacity: 0.8 },
  textCenter: { textAlign: "center" },
  barWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  barTrack: {
    width: 120, height: 3, borderRadius: radius.pill,
    backgroundColor: color.whiteA(0.25), overflow: "hidden",
  },
  barFill: {
    width: "100%", height: 3, borderRadius: radius.pill, backgroundColor: color.white,
    transformOrigin: "left center",
  },
  errorWrap: {
    backgroundColor: color.bqDeep, alignItems: "center", justifyContent: "center",
    gap: space.x3, paddingHorizontal: space.x8,
  },
  retry: { marginTop: space.x4, alignSelf: "stretch" },
});
