import { useCallback, useEffect, useState } from "react";
import { useFonts } from "expo-font";
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold,
} from "@expo-google-fonts/be-vietnam-pro";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { BrandSplash } from "@/components/brand/BrandSplash";
import { colors } from "@/legacy-theme";
import { color } from "@/theme";

// Giữ native splash cho tới khi BrandSplash đã vẽ xong khung đầu tiên. Thiếu dòng
// này thì giữa native splash và JS có một nháy trắng.
void SplashScreen.preventAutoHideAsync();

/**
 * Thời gian tối đa chờ font trước khi vẽ bằng font hệ thống.
 *
 * Trước đây màn hình chờ KHÔNG có đường thoát: `useFonts` không trả true thì app
 * đứng mãi ở vòng xoay. Đã tái hiện được trên bản export web (`expo export -p
 * web`) — treo hơn hai phút, trong khi native cùng mã nguồn chạy bình thường.
 * Chữ nhảy font một nhịp vẫn hơn một app không bao giờ mở.
 */
const FONT_TIMEOUT_MS = 2500;

/**
 * Màu nền dùng chung cho native splash, root view và Stack khi splash còn hiện.
 * PHẢI trùng `backgroundColor` trong app.json — lệch một chút là thấy ranh giới.
 */
const SPLASH_BG = color.bq;

/**
 * Thời gian tối đa chờ backend trả lời lúc khởi động.
 *
 * Cùng một loại lỗi với cổng chờ font: nếu request KHÔNG hỏng mà chỉ treo (mạng
 * chập chờn, proxy nuốt gói), promise không bao giờ settle và splash đứng mãi.
 * Đã gặp đúng tình huống đó khi chụp khung hình từ bản web — thanh tiến độ dừng
 * ở 50%% suốt 1,8 giây. Hết hạn thì coi như lỗi và hiện nút "Thử lại".
 */
const WARMUP_TIMEOUT_MS = 8000;

/** Thua cuộc đua với timeout thì ném lỗi, thay vì treo vô hạn. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Máy chủ không phản hồi.")), ms)),
  ]);
}

/**
 * Lỗi mạng thô của nền tảng ("Failed to fetch", "Network request failed") không
 * nói được gì cho đại lý. Dịch sang câu người đọc hiểu, giữ nguyên thông điệp đã
 * là tiếng Việt (ví dụ câu timeout ở trên).
 */
function readableError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|network request failed|load failed/i.test(raw)) {
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  }
  return raw;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Be Vietnam Pro: font của bộ giao diện mới (src/components/ui).
    BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold,
    // Inter: các màn CHƯA di trú vẫn dùng. Gỡ ở Phase 5 khi không còn chỗ nào
    // import `@/legacy-theme` — kiểm bằng: grep -rn "@/legacy-theme" app src
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);
  const fontsSettled = fontsLoaded || !!fontError || fontTimedOut;

  if (fontError) {
    console.warn("[BQ] Không nạp được font, dùng font hệ thống:", fontError);
  }

  // --- Nạp dữ liệu khởi tạo -------------------------------------------------
  // Gọi một endpoint nhẹ để BIẾT backend có trả lời không, trước khi người dùng
  // bấm bất cứ thứ gì. Thanh tiến độ trên splash bám vào việc này, nên nó phản
  // ánh tiến độ THẬT chứ không phải đồng hồ đếm lùi.
  const [attempt, setAttempt] = useState(0);
  // Kết quả nạp gắn kèm SỐ LẦN THỬ. Nhờ vậy lúc bấm "Thử lại" chỉ cần tăng
  // `attempt` là mọi giá trị dẫn xuất tự về false — không phải gọi setState đồng
  // bộ ngay trong effect, thứ gây render dây chuyền (lint chặn đúng).
  const [warm, setWarm] = useState({ attempt: 0, done: false, error: null as string | null });

  useEffect(() => {
    let alive = true;
    withTimeout(api.categories(), WARMUP_TIMEOUT_MS)
      .then(() => { if (alive) setWarm({ attempt, done: true, error: null }); })
      .catch((e: unknown) => {
        // Không nuốt lỗi: app đại lý không làm được gì nếu backend im lặng —
        // danh mục, giá, tồn kho và hạn mức đều ở đó. Báo một lần ở đây tử tế
        // hơn để người dùng vấp lỗi ở năm màn khác nhau.
        if (alive) {
          setWarm({ attempt, done: false, error: readableError(e) });
        }
      });
    return () => { alive = false; };
  }, [attempt]);

  const settled = warm.attempt === attempt;
  const warmupDone = settled && warm.done;
  const loadError = settled ? warm.error : null;

  const progress = (fontsSettled ? 0.5 : 0) + (warmupDone ? 0.5 : 0);
  const ready = fontsSettled && warmupDone;

  const [splashGone, setSplashGone] = useState(false);
  /** Nền đã trả về màu màn đích chưa — bật ở lúc splash BẮT ĐẦU rời. */
  const [bgHandedOver, setBgHandedOver] = useState(false);

  /**
   * Màn đích ĐỨNG YÊN ở opacity 1, không hoạt cảnh gì.
   *
   * Trước đây nó sáng dần 0.9 -> 1 và nhích 0.985 -> 1 cùng lúc splash mờ ra.
   * Hai lớp bán trong suốt chồng nhau cho ra đúng cái "cam đục lẫn chữ": trong
   * khoảng 400ms đó không khung nào là một màn hình rõ ràng cả. Giờ splash tự
   * zoom xuyên qua rồi tan, còn màn đích nằm sẵn bên dưới đã vẽ xong.
   */
  const handleSplashFinish = useCallback(() => setSplashGone(true), []);

  /**
   * Splash bắt đầu rời đi: trả nền về màu của màn đích.
   *
   * Trong lúc splash còn phủ, nền root và nền Stack phải là màu splash để mọi
   * khung RN chưa kịp vẽ đều rơi vào màu đó thay vì trắng. Đổi lúc này, không
   * sớm hơn.
   */
  const handleSplashExitStart = useCallback(() => setBgHandedOver(true), []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /**
   * Gỡ native splash CHỈ KHI BrandSplash đã vẽ xong khung đầu và ảnh giày đã
   * giải mã.
   *
   * Trước đây gọi trong một useEffect lúc mount: native splash biến mất ngay khi
   * React commit lần đầu, trong khi BrandSplash còn chưa có ảnh — vài khung đó
   * lộ nền của root view, và đó chính là cú chớp trắng thấy trong video.
   */
  const revealApp = useCallback(() => SplashScreen.hideAsync(), []);

  return (
    // Nền root CÙNG MÀU splash khi splash còn hiện: mọi khung mà RN chưa kịp vẽ
    // nội dung đều rơi vào màu này thay vì màu trắng mặc định.
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: bgHandedOver ? colors.bg : SPLASH_BG }}
    >
      <SafeAreaProvider>
        <SessionProvider>
          <CartProvider>
            {/* StatusBar của màn đích; khi splash còn hiện, BrandSplash tự khai
                đè thành chữ trắng. */}
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 17, color: colors.text },
                headerTintColor: colors.brand[500],
                // Cùng lý do: trong lúc splash còn phủ, nền của Stack phải là màu
                // splash — không thì lúc splash mờ đi sẽ thấy một lớp sáng lọt qua.
                contentStyle: { backgroundColor: bgHandedOver ? colors.bg : SPLASH_BG },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="product/[code]" options={{ title: "Chi tiết sản phẩm" }} />
              <Stack.Screen name="order/[id]" options={{ title: "Chi tiết đơn hàng" }} />
              <Stack.Screen name="cart" options={{ title: "Giỏ hàng" }} />
              <Stack.Screen name="checkout" options={{ title: "Xác nhận đơn" }} />
              <Stack.Screen name="assistant" options={{ title: "Trợ lý BQ" }} />
              <Stack.Screen name="notifications" options={{ title: "Thông báo" }} />
            </Stack>

            {splashGone ? null : (
              <BrandSplash
                ready={ready}
                progress={progress}
                error={loadError}
                onRetry={retry}
                onReadyToReveal={revealApp}
                onExitStart={handleSplashExitStart}
                onFinish={handleSplashFinish}
              />
            )}
          </CartProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
