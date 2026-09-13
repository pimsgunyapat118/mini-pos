"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function HistoryPage() {
  // รายการประวัติการขายทั้งหมด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // โหลดข้อมูลการขายจาก Supabase เรียงล่าสุดไปเก่าสุด
  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSales(data);
      setErrorMsg('');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // คำนวณยอดขายรวมทั้งหมด
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total_price), 0);

  // จัดรูปแบบวันเวลาให้อ่านง่าย
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div>
      <h1>ประวัติการขาย</h1>

      {errorMsg && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>
      )}

      {/* สรุปยอดขายรวมทั้งหมด */}
      <div
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
        }}
      >
        ยอดขายรวมทั้งหมด: {totalSales.toFixed(2)} บาท
      </div>

      {loading ? (
        <p>กำลังโหลดข้อมูล...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วันเวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{formatDateTime(sale.sold_at)}</td>
                <td>{sale.product_name}</td>
                <td>{sale.quantity}</td>
                <td>{Number(sale.total_price).toFixed(2)}</td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>
                  ยังไม่มีประวัติการขาย
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
