/**
 * Bộ component giao diện dùng chung của app đại lý.
 *
 * Screen trong `app/` CHỈ ghép những thứ ở đây — không tự viết nút bằng
 * Pressable, không dùng `Text` gốc của react-native, không khai màu/cỡ chữ/bo
 * góc dạng số. Cần một biến thể mới thì MỞ RỘNG component sẵn có bằng prop,
 * đừng tạo bản sao.
 */
export { T, type TProps } from "./T";
export { Num } from "./Num";
export { Price, type PriceProps } from "./Price";
export { Pill, type PillProps, type PillTone } from "./Pill";
export { IconButton, type IconButtonProps, type IconButtonTone } from "./IconButton";
export { Fab, FAB_CLEARANCE, type FabProps } from "./Fab";
export { Badge, type BadgeProps } from "./Badge";
export { Chip, type ChipProps } from "./Chip";
export { StatusTag, statusKindFor, type StatusTagProps, type StatusKind } from "./StatusTag";
export { Card, CardDivider, type CardProps } from "./Card";
export { CreditCard, type CreditCardProps } from "./CreditCard";
export { OrderCard, type OrderCardProps } from "./OrderCard";
export { ListRow, type ListRowProps } from "./ListRow";
export { SectionHead, type SectionHeadProps } from "./SectionHead";
export { SearchField, type SearchFieldProps } from "./SearchField";
export { Stepper, type StepperProps } from "./Stepper";
export { SegmentedControl, type SegmentedControlProps } from "./SegmentedControl";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { Dock, DOCK_CLEARANCE, type DockProps } from "./Dock";
export { ScreenHeader, type ScreenHeaderProps } from "./ScreenHeader";
export { ProductImage, type ProductImageProps } from "./ProductImage";
