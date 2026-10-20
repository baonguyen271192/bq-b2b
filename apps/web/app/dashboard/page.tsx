import { redirect } from "next/navigation";

// Dashboard cũ đã được thay bằng Admin panel đầy đủ. Giữ URL cũ hoạt động.
export default function DashboardRedirect() {
  redirect("/admin/orders");
}
