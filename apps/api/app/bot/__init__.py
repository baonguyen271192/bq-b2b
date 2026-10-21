"""Bot bán lẻ: khách nhắn Trang Facebook của BQ, bot tư vấn và chốt đơn.

Ranh giới của gói này:

- KHÔNG giữ dữ liệu. Danh mục đọc từ backend Java qua `bq_client`; đơn chốt xong
  ghi bằng `POST /api/retail/orders`. Giống hệt lý do service trợ lý bỏ lớp dữ
  liệu riêng — hai nguồn sự thật là hai câu trả lời khác nhau cho cùng câu hỏi.
- KHÔNG tự tính tiền để tin. Bot tính tổng để HIỂN THỊ cho khách; backend tính
  lại và từ chối nếu lệch.
- Phiên hội thoại nằm trong bộ nhớ tiến trình (`session.py`) — xem giới hạn ghi
  trong file đó.
"""
