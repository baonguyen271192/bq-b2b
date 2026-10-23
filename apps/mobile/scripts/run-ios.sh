#!/usr/bin/env bash
#
# Dựng app đại lý BQ lên máy ảo iOS.
#
# TẠI SAO KHÔNG DÙNG `expo run:ios` / `expo start --ios`:
# Cả hai mở máy ảo bằng `Simulator.app`. Xcode 27 (06/2026) đã BỎ app đó và thay
# bằng `DeviceHub.app` ở `Xcode.app/Contents/Applications/` — thư mục
# `Contents/Developer/Applications/` không còn tồn tại. Expo CLI vẫn dò đường dẫn
# cũ nên trên Xcode 27 nó build xong rồi dừng ở bước mở máy ảo:
#   https://github.com/expo/expo/issues/46671
#
# Script này gọi thẳng `xcodebuild` + `simctl` nên KHÔNG phụ thuộc vào tên của app
# xem máy ảo, và tự chọn đúng trình xem cho cả Xcode cũ lẫn mới.
#
# Dùng:
#   ./scripts/run-ios.sh                        # máy ảo đang bật, hoặc iPhone mới nhất
#   ./scripts/run-ios.sh "iPhone 17 Pro Max"    # chỉ định theo tên
#   ./scripts/run-ios.sh <UDID>
#   ./scripts/run-ios.sh --release            # bản Release, JS nhúng sẵn
#
# Bản Debug cần Metro chạy sẵn (`pnpm dev:mobile`) vì JS nạp qua mạng. Bản Release
# nhúng sẵn bundle JS nên chạy độc lập — dùng nó khi cần đo hiệu năng hoặc quay
# video, vì Debug có thêm bridge dev, chậm hơn và nhịp animation không đại diện.

set -euo pipefail
cd "$(dirname "$0")/.."

die() { printf '\n[run-ios] %s\n' "$*" >&2; exit 1; }
log() { printf '[run-ios] %s\n' "$*"; }

command -v xcrun >/dev/null 2>&1 || die "Không có xcrun — cần cài Xcode."

# --- 0. Cờ dòng lệnh --------------------------------------------------------
config=Debug
args=()
for a in "$@"; do
  case "$a" in
    --release) config=Release ;;
    --debug)   config=Debug ;;
    *)         args+=("$a") ;;
  esac
done
log "cấu hình: $config"

# Đóng dấu ngày giờ build vào bundle. BrandSplash hiện dấu này ngay trên màn khi
# EXPO_PUBLIC_SPLASH_DEBUG=1, nên video quay ra tự mang danh tính bản build —
# đã mất ba vòng vào chuyện xem nhầm máy ảo còn bản cũ.
export EXPO_PUBLIC_SPLASH_VERSION="${EXPO_PUBLIC_SPLASH_VERSION:-$(date '+%m%d-%H%M%S')}"
log "dấu build: $EXPO_PUBLIC_SPLASH_VERSION"

# --- 1. Chọn máy ảo ---------------------------------------------------------
udid_of() { sed -n 's/.*(\([0-9A-F][0-9A-F-]\{35\}\)).*/\1/p' | head -1; }

want="${args[0]:-${BQ_IOS_DEVICE:-}}"
if [ -n "$want" ]; then
  # Khớp ĐÚNG tên trước: "iPhone 17 Pro" mà khớp một phần sẽ dính "iPhone 17 Pro
  # Max" — chạy nhầm máy mà không biết. Dòng của simctl có dạng "<tên> (<UDID>)",
  # nên bám vào " (" là khớp trọn tên.
  udid=$(xcrun simctl list devices available | grep -F "$want (" | udid_of || true)
  [ -n "$udid" ] || udid=$(xcrun simctl list devices available | grep -F "$want" | udid_of || true)
  [ -n "$udid" ] || die "Không tìm thấy máy ảo khớp \"$want\". Xem danh sách: xcrun simctl list devices available"
else
  udid=$(xcrun simctl list devices booted | udid_of || true)
  [ -n "$udid" ] || udid=$(xcrun simctl list devices available | grep -E '^ +iPhone' | tail -1 | udid_of || true)
  [ -n "$udid" ] || die "Máy không có máy ảo iPhone nào. Tải runtime trong Xcode > Settings > Components."
fi
name=$(xcrun simctl list devices | grep -F "$udid" | sed 's/^ *//;s/ (.*//' || true)
log "máy ảo: $name ($udid)"

# Nhiều máy ảo cùng bật là cái bẫy đã ba lần làm mất một vòng làm việc: script
# cài lên một máy, DeviceHub liệt kê hết, xem nhầm máy còn bản cũ rồi kết luận
# build không ăn. Cảnh báo không đủ — nên từ đây script CÀI LÊN MỌI MÁY ĐANG BẬT
# (xem mục 4), và liệt kê ra ngay để biết sẽ đụng vào những máy nào.
others=$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F][0-9A-F-]\{35\}\)).*/\1/p' | grep -v "$udid" || true)
if [ -n "$others" ]; then
  log "máy ảo khác đang bật, sẽ cài bản này lên luôn:"
  for o in $others; do
    log "  - $(xcrun simctl list devices | grep -F "$o" | sed 's/^ *//;s/ (.*//')"
  done
fi

# --- 2. Sinh project native nếu chưa có, hoặc nếu danh sách gói đã đổi -------
# ios/ là sản phẩm phụ (Continuous Native Generation), bị gitignore — sinh lại
# được bất cứ lúc nào từ app.json.
#
# Dấu vân tay của `dependencies` được lưu lại trong ios/. Thêm một gói có phần
# native (vd expo-secure-store) mà không prebuild + pod install lại thì bản build
# vẫn chạy, nhưng vỡ lúc dùng với "Cannot find native module '...'" — một lỗi
# runtime không hề nhắc tới nguyên nhân thật. Đã mất một vòng build vì chuyện này.
deps_now=$(node -e 'const d=require("./package.json").dependencies||{};process.stdout.write(JSON.stringify(Object.keys(d).sort().map(k=>k+"@"+d[k])))' | shasum | cut -d" " -f1)
stamp=ios/.bq-deps-sha
deps_changed=0
if [ -d ios ] && [ "$(cat "$stamp" 2>/dev/null || true)" != "$deps_now" ]; then
  deps_changed=1
  log "danh sách gói đã đổi — prebuild + pod install lại"
fi

if [ ! -d ios ] || [ "$deps_changed" = 1 ]; then
  [ -d ios ] || log "chưa có ios/ — chạy expo prebuild"
  # prebuild ĐÈ package.json#scripts về mặc định của Expo — trong đó có
  # `"ios": "expo run:ios"`, đúng cái lệnh hỏng trên Xcode 27. Chép ra rồi trả
  # lại để lần chạy sau không âm thầm quay về lệnh hỏng.
  pkg_backup=$(mktemp)
  cp package.json "$pkg_backup"
  npx expo prebuild --platform ios --no-install
  if ! cmp -s package.json "$pkg_backup"; then
    cp "$pkg_backup" package.json
    log "đã trả lại package.json (prebuild tự đè scripts)"
  fi
  rm -f "$pkg_backup"
fi

workspace=$(ls -d ios/*.xcworkspace 2>/dev/null | head -1 || true)
if [ -z "$workspace" ] || [ ! -d ios/Pods ] || [ "$deps_changed" = 1 ]; then
  log "cài CocoaPods"
  ( cd ios && pod install )
  workspace=$(ls -d ios/*.xcworkspace 2>/dev/null | head -1 || true)
fi
printf '%s' "$deps_now" > "$stamp" 2>/dev/null || true
[ -n "$workspace" ] || die "Không tạo được .xcworkspace. Chạy tay: cd ios && pod install"

scheme=$(basename "$workspace" .xcworkspace)
log "scheme: $scheme"

# --- 3. Build ---------------------------------------------------------------
# CODE_SIGNING_ALLOWED=NO: build cho máy ảo không cần ký, bật lên chỉ tổ hỏi
# chứng chỉ mà máy nào cũng khác nhau.
log "build (lần đầu ~4 phút; Release lâu hơn vì phải đóng gói JS)"
xcodebuild \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration "$config" \
  -sdk iphonesimulator \
  -destination "id=$udid" \
  -derivedDataPath ios/build \
  CODE_SIGNING_ALLOWED=NO \
  build >/tmp/bq-xcodebuild.log 2>&1 \
  || die "Build hỏng. Log đầy đủ: /tmp/bq-xcodebuild.log — 20 dòng cuối:
$(tail -20 /tmp/bq-xcodebuild.log)"

app="ios/build/Build/Products/$config-iphonesimulator/$scheme.app"
[ -d "$app" ] || die "Build xong nhưng không thấy $app"

# Đọc bundle id từ chính bản vừa build, KHÔNG đoán từ app.json: app.json có thể
# đã sửa mà chưa prebuild lại, lúc đó launch sẽ trượt sang bundle id cũ.
bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")
log "bundle id: $bundle_id"

# --- 4. Cài và chạy ---------------------------------------------------------
xcrun simctl boot "$udid" 2>/dev/null || true
xcrun simctl bootstatus "$udid" -b >/dev/null
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" "$bundle_id" >/dev/null
log "đã cài và chạy trên $name"

# Mọi máy đang bật đều nhận cùng bản này. Gỡ trước khi cài: iOS giữ cache
# launch screen theo bundle, cài đè không phải lúc nào cũng làm mới nó.
for o in $others; do
  on=$(xcrun simctl list devices | grep -F "$o" | sed 's/^ *//;s/ (.*//')
  xcrun simctl terminate "$o" "$bundle_id" 2>/dev/null || true
  xcrun simctl uninstall "$o" "$bundle_id" 2>/dev/null || true
  xcrun simctl install "$o" "$app"
  log "đã cài lên $on"
done

# --- 5. Mở trình xem máy ảo -------------------------------------------------
# Xcode >= 27: DeviceHub.app. Xcode <= 26: Simulator.app. Thử cả hai.
xcode_contents=$(dirname "$(xcode-select -p)")
viewer=""
for candidate in \
  "$xcode_contents/Applications/DeviceHub.app" \
  "$(xcode-select -p)/Applications/Simulator.app"; do
  [ -d "$candidate" ] && { viewer="$candidate"; break; }
done

if [ -n "$viewer" ]; then
  open "$viewer"
  log "đã mở $(basename "$viewer") — chọn \"$name\" để xem và bấm"
else
  log "KHÔNG tìm thấy DeviceHub.app lẫn Simulator.app."
  log "App vẫn đang chạy trong máy ảo; chụp màn hình bằng:"
  log "  xcrun simctl io $udid screenshot ~/Desktop/bq.png"
fi

# --- 6. Nhắc Metro ----------------------------------------------------------
# Chỉ bản Debug mới nạp JS từ Metro. Thiếu Metro thì app mở ra màn đỏ báo lỗi kết
# nối. Bản Release đã nhúng bundle nên không cần.
if [ "$config" = Debug ] && ! curl -sS --max-time 3 http://localhost:8081/status >/dev/null 2>&1; then
  log ""
  log "CẢNH BÁO: không thấy Metro ở :8081. Mở terminal khác và chạy:"
  log "  pnpm dev:mobile"
fi
