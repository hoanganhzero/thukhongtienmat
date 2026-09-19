export const dynamic = 'force-dynamic';
import { formatDate } from '@/lib/date-format';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { amountInWords } from '@/lib/receipt';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = (await auth())?.user as any;
  if (user?.role !== 'admin') return new Response('Chưa đăng nhập', { status: 401 });
  const { id } = await params;
  const item = await prisma.feeAssignment.findUnique({ where: { id }, include: { student: { include: { class: { include: { campus: true } } } }, feeType: true } });
  if (!item || item.status !== 'confirmed') return new Response('Chỉ xuất chứng từ cho khoản đã xác nhận thanh toán', { status: 400 });
  if (user.adminRole === 'teacher' && item.student.classId !== user.classId) return new Response('Không có quyền', { status: 403 });
  const settings = Object.fromEntries((await prisma.appSetting.findMany()).map((setting) => [setting.key, setting.value]));
  const paidAt = item.paidAt ?? item.updatedAt;
  const receiptNo = `${settings.receipt_prefix || 'PT'}-${paidAt.getFullYear()}-${item.id.slice(-8).toUpperCase()}`;
  const date = formatDate(paidAt);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(receiptNo)}</title><style>@page{size:A4;margin:18mm}body{font-family:"Times New Roman",serif;color:#111;font-size:15px}.top{display:flex;justify-content:space-between;text-align:center}.unit{width:55%}.meta{width:40%;text-align:right}.title{text-align:center;margin:30px 0 20px}.title h1{font-size:24px;margin:0}.title p{margin:5px}.line{margin:11px 0}.label{display:inline-block;min-width:155px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #333;padding:9px}th{background:#eee}.right{text-align:right}.sign{display:flex;justify-content:space-between;text-align:center;margin-top:32px}.sign div{width:42%}.note{font-size:12px;color:#555;border-top:1px solid #aaa;margin-top:60px;padding-top:8px}button{margin-bottom:16px;padding:8px 14px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">In / Lưu PDF</button><div class="top"><div class="unit"><b>${escape(settings.school_name || 'TRUNG TÂM GDNN-GDTX KHU VỰC TÂN NINH')}</b><br>${escape(settings.school_address || '')}<br>Mã số thuế: ${escape(settings.school_tax_code || 'Chưa cấu hình')}</div><div class="meta"><b>Mẫu chứng từ thu nội bộ</b><br>Số: ${escape(receiptNo)}<br>Ngày lập: ${escape(date)}</div></div><div class="title"><h1>PHIẾU XÁC NHẬN THU TIỀN</h1><p>Năm học ${escape(item.academicYear)}</p></div><div class="line"><span class="label">Họ tên học sinh:</span><b>${escape(item.student.fullName)}</b></div><div class="line"><span class="label">Mã học sinh:</span>${escape(item.student.studentCode)}</div><div class="line"><span class="label">Lớp/Đơn vị:</span>${escape(item.student.class.name)} – ${escape(item.student.class.campus.name)}</div><table><thead><tr><th>STT</th><th>Nội dung thu</th><th class="right">Số tiền (đồng)</th></tr></thead><tbody><tr><td>1</td><td>${escape(item.feeType.name)}${item.bhytMonths ? ` – ${item.bhytMonths} tháng` : ''}</td><td class="right">${item.amount.toLocaleString('vi-VN')}</td></tr><tr><th colspan="2" class="right">Tổng cộng</th><th class="right">${item.amount.toLocaleString('vi-VN')}</th></tr></tbody></table><div class="line"><b>Bằng chữ:</b> ${escape(amountInWords(item.amount))}</div><div class="line"><b>Hình thức thanh toán:</b> Chuyển khoản</div><div class="sign"><div><b>Người nộp tiền</b><br><i>(Ký, ghi rõ họ tên)</i></div><div><b>Người lập chứng từ/Thủ quỹ</b><br><i>(Ký, ghi rõ họ tên)</i></div></div><div class="note">Chứng từ này xác nhận khoản tiền đã thu trong hệ thống của đơn vị. Không thay thế hóa đơn điện tử có mã của cơ quan thuế khi pháp luật yêu cầu; việc phát hành hóa đơn điện tử chính thức phải thực hiện qua nhà cung cấp hóa đơn điện tử được cấp phép.</div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
