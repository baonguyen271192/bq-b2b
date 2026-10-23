import { useCallback, useEffect, useState } from "react";
import { useFonts } from "expo-font";
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
import { color, fontFamily, textStyle } from "@/theme";

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
 *
 * Là `flame`, KHÔNG phải `brand`: `app.json` và lớp phẳng dưới cùng của
 * `BrandSplash` (`styles.flat`) đều dùng `flame`. Trước đây chỗ này để `brand`
 * nên ba nơi lẽ ra phải bằng nhau lại có hai màu — chỉ lộ ra ở một hai khung
 * lúc splash bàn giao nền.
 */
const SPLASH_BG = color.flame;

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
    // Chỉ còn Be Vietnam Pro. Inter đã gỡ cùng bộ giao diện cũ ở Phase 5 —
    // gói @expo-google-fonts/inter cũng đã xoá khỏi package.json.
    BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold,
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
      style={{ flex: 1, backgroundColor: bgHandedOver ? color.canvas : SPLASH_BG }}
    >
      <SafeAreaProvider>
        <SessionProvider>
          <CartProvider>
            {/* StatusBar của màn đích; khi splash còn hiện, BrandSplash tự khai
                đè thành chữ trắng. */}
            <StatusBar style="dark" />
            {/*
              Chỉ dựng cây màn hình KHI font đã ngã ngũ.

              iOS đo chữ MỘT LẦN lúc node Text được tạo. Màn hình mount trước khi
              `useFonts` xong thì mọi dòng chữ đo và vẽ bằng font hệ thống; props
              sau đó không đổi nên RN không đo lại khi font về, và app chạy hết
              phiên bằng San Francisco. Chữ đậm ra chữ thường, chữ rộng hơn Be
              Vietnam Pro nên nhãn dài bị cắt ("Kích hoạt từ lời mời của…").

              Bản web KHÔNG dính: font nạp qua `@font-face`, trình duyệt tự vẽ
              lại khi font về. Vì vậy bảy vòng ảnh so sánh trên web đều sạch mà
              máy thật vẫn sai — chỉ lộ ra khi chụp trên máy ảo.

              `key` lo nhánh timeout: nếu đã bỏ cuộc chờ font rồi font mới về thì
              dựng lại cây đúng một lần, thay vì giữ chữ sai cả phiên. Lúc đó
              splash vẫn đang phủ nên người dùng không thấy cú dựng lại.
            */}
            {fontsSettled ? (
              <Stack
                key={fontsLoaded ? "fonts-ready" : "system-font"}
                screenOptions={{
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: color.paper },
                  headerTitleStyle: {
                    fontFamily: fontFamily.bold,
                    fontSize: textStyle.section.fontSize,
                    color: color.ink,
                  },
                  headerTintColor: color.brand,
                  // Cùng lý do: trong lúc splash còn phủ, nền của Stack phải là màu
                  // splash — không thì lúc splash mờ đi sẽ thấy một lớp sáng lọt qua.
                  contentStyle: { backgroundColor: bgHandedOver ? color.canvas : SPLASH_BG },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                {/* Các màn dưới đây tự dựng tiêu đề bằng `ScreenHeader` kiểu back,
                    nên tắt header của Stack để không có hai tiêu đề chồng nhau. */}
                <Stack.Screen name="otp" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen name="search" options={{ headerShown: false }} />
                {/* Chi tiết sản phẩm có ảnh tràn viền và nút glass nổi trên ảnh (SPEC
                    §3.5), nên không dùng header của Stack. */}
                <Stack.Screen name="product/[code]" options={{ headerShown: false }} />
                <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="cart" options={{ headerShown: false }} />
                <Stack.Screen name="order/sent" options={{ headerShown: false }} />
                <Stack.Screen name="drafts" options={{ headerShown: false }} />
                <Stack.Screen name="addresses" options={{ headerShown: false }} />
                <Stack.Screen name="invoices" options={{ headerShown: false }} />
                <Stack.Screen name="invoice/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="transfer/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="pay" options={{ headerShown: false }} />
                <Stack.Screen name="assistant" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
              </Stack>
            ) : null}

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
