#!/bin/sh
# Chạy lệnh truyền vào với đúng JDK mà dự án cần.
#
# VÌ SAO cần: mvnw dùng `java` trên PATH nếu JAVA_HOME chưa đặt. Máy có nhiều JDK
# (rất thường gặp) sẽ lấy nhầm bản, rồi lỗi ra dưới dạng khó hiểu:
#   "class file version 65.0, this version only recognizes up to 61.0"
# Đó là Java 17 đang cố đọc class do Java 21 biên dịch — không liên quan gì tới code.
#
# Dùng: ./scripts/with-java.sh ./mvnw -B test
set -e

REQUIRED_MAJOR=21

java_major() {
    [ -x "$1/bin/java" ] || return 1
    "$1/bin/java" -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/'
}

# Chỉ chấp nhận ứng viên ĐỦ PHIÊN BẢN. Phải kiểm từng ứng viên, không tin mã thoát:
# trên macOS `java_home -v 21` trả về 0 kèm JDK CŨ HƠN khi không có bản 21 nào
# đăng ký với hệ thống — và openjdk@21 của Homebrew là keg-only nên không đăng ký.
try_candidate() {
    MAJOR=$(java_major "$1" 2>/dev/null) || return 1
    [ -n "$MAJOR" ] || return 1
    [ "$MAJOR" -ge "$REQUIRED_MAJOR" ] 2>/dev/null || return 1
    JAVA_HOME="$1"
    export JAVA_HOME
    return 0
}

# 1. JAVA_HOME đang đặt và đủ mới.
if [ -n "$JAVA_HOME" ] && try_candidate "$JAVA_HOME"; then
    exec "$@"
fi

# 2. macOS: hỏi hệ thống (kết quả vẫn phải kiểm lại phiên bản).
if [ -x /usr/libexec/java_home ]; then
    if HOME_DIR=$(/usr/libexec/java_home -v "$REQUIRED_MAJOR" 2>/dev/null); then
        if try_candidate "$HOME_DIR"; then
            exec "$@"
        fi
    fi
fi

# 3. Đường dẫn thường gặp (Homebrew keg-only không nằm trên PATH).
for CANDIDATE in \
    /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /usr/lib/jvm/java-21-openjdk-amd64 \
    /usr/lib/jvm/java-21-openjdk
do
    if try_candidate "$CANDIDATE"; then
        exec "$@"
    fi
done

echo "Không tìm thấy JDK $REQUIRED_MAJOR." >&2
echo "Đặt JAVA_HOME trỏ tới JDK $REQUIRED_MAJOR rồi chạy lại. Ví dụ trên macOS:" >&2
echo "  export JAVA_HOME=\$(/usr/libexec/java_home -v $REQUIRED_MAJOR)" >&2
exit 1
