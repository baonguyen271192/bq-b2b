/**
 * Bộ component dùng chung của app — đủ danh mục `docs/design/v2/SPEC.md` §2.
 *
 * Screen trong `app/` CHỈ ghép từ đây: không `Text` gốc của React Native, không
 * `Pressable` tự chế, không hex / fontSize / borderRadius dạng số. Mẫu giao
 * diện xuất hiện từ hai chỗ trở lên thì tách thành component ở đây.
 */

// --- Chữ và số ------------------------------------------------------------
export { T, TONE, type TProps } from "./T";
export { Num } from "./Num";
export { Price, type PriceProps } from "./Price";

// --- Nút ------------------------------------------------------------------
export { Pill, type PillProps, type PillTone } from "./Pill";
export { IconButton, type IconButtonProps, type IconButtonTone } from "./IconButton";
export { TextButton, type TextButtonProps } from "./TextButton";
export { DashedButton, type DashedButtonProps } from "./DashedButton";

// --- Nhãn, chip, trạng thái -----------------------------------------------
export { Badge, type BadgeProps } from "./Badge";
export { Chip, type ChipProps } from "./Chip";
export { SizeChip, type SizeChipProps } from "./SizeChip";
export { StatusTag, statusKindFor, type StatusTagProps, type StatusKind } from "./StatusTag";
export { statusIconFor, statusColorsFor } from "./status-icon";

// --- Khung màn hình -------------------------------------------------------
export { ScreenHeader, type ScreenHeaderProps } from "./ScreenHeader";
export { Card, CardDivider } from "./Card";
export { SectionHead } from "./SectionHead";
export { Dock, DOCK_CLEARANCE, DOCK_CLEARANCE_ACTIONS, type DockProps, type DockSummary } from "./Dock";
export { TabBar, TAB_BAR_CLEARANCE, type TabBarProps, type TabItem } from "./TabBar";
export { BottomSheet, type BottomSheetProps } from "./BottomSheet";
export { Toast } from "./Toast";
export { EmptyState } from "./EmptyState";
export { Notice, type NoticeKind } from "./Notice";
export {
  NotificationRow, type NotificationRowProps, type NotificationTone,
} from "./NotificationRow";
export { OfflineBanner, type OfflineBannerProps } from "./OfflineBanner";
export { Skeleton } from "./Skeleton";

// --- Dòng và danh sách ----------------------------------------------------
export { ListRow, type ListRowProps } from "./ListRow";
export { DetailRow } from "./DetailRow";
export {
  InvoicePreview, type InvoicePreviewProps, type InvoicePreviewLine,
} from "./InvoicePreview";
export { StatPair } from "./StatPair";
export { SplitBar, type SplitBarProps } from "./SplitBar";
export { Timeline, type TimelineStep, type TimelineState } from "./Timeline";
export { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl";

// --- Nhập liệu ------------------------------------------------------------
export { TextField } from "./TextField";
export { SearchField, type SearchFieldProps } from "./SearchField";
export { Select, type SelectProps, type SelectOption } from "./Select";
export { Switch, type SwitchProps } from "./Switch";
export { RadioCard, type RadioCardProps } from "./RadioCard";

// --- Sản phẩm và size -----------------------------------------------------
export { ProductImage, type ProductImageProps } from "./ProductImage";
export { ProductMini, type ProductMiniProps } from "./ProductMini";
export { Stepper, type StepperProps } from "./Stepper";
export { SizeRow, stockLabel, stockLevel, type SizeRowProps } from "./SizeRow";
export { SizeList, type SizeListProps, type SizeQty } from "./SizeList";
export { StockStamp, hhmm, STOCK_STALE_MS, type StockStampProps } from "./StockStamp";

// --- Nghiệp vụ dùng lại nhiều màn -----------------------------------------
export { Avatar } from "./Avatar";
export { CreditCard, type CreditCardProps } from "./CreditCard";
export { QuickAction, type QuickActionProps } from "./QuickAction";
export { AddressCard, AddressPin, formatAddress, type Address, type AddressCardProps } from "./AddressCard";
export { CartLineCard, type CartLineCardProps } from "./CartLineCard";
export { OrderCard } from "./OrderCard";
export { ChatBubble } from "./ChatBubble";
