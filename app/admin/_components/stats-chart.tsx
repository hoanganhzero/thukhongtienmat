'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Props {
  campusStats: { id: string; name: string; studentCount: number; totalAmount: number; confirmedAmount: number }[];
}

export default function StatsChart({ campusStats }: Props) {
  const data = (campusStats ?? []).map((c: any) => ({
    name: (c?.name ?? '').replace('Trung tâm ', '').replace('Điểm trường ', 'ĐT ').replace('Phân hiệu ', 'PH '),
    'Cần thu': (c?.totalAmount ?? 0) / 1000,
    'Đã thu': (c?.confirmedAmount ?? 0) / 1000,
  }));

  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} tick={{ fontSize: 10 }} label={{ value: 'Nghìn đ', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Cần thu" fill="#FF9149" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Đã thu" fill="#80D8C3" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
