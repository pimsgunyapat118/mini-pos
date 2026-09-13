"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SellPage() {
  // รายการสินค้าทั้งหมด (สำหรับ dropdown)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ค่าที่เลือกในฟอร์มขาย
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // โหลดรายการสินค้าจาก Supabase
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // หาสินค้าที่ถูกเลือกอยู่ในปัจจุบัน
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณยอดรวมอัตโนมัติ
  const qtyNumber = parseInt(quantity, 10) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * qtyNumber : 0;

  const resetForm = () => {
    setSelectedProductId('');
    setQuantity('');
  };

  // ทำรายการขาย
  const handleSell = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProduct) {
      setErrorMsg('กรุณาเลือกสินค้า');
      return;
    }
    if (qtyNumber <= 0) {
      setErrorMsg('กรุณากรอกจำนวนให้ถูกต้อง');
      return;
    }

    // ตรวจสอบ stock คงเหลือให้เพียงพอ
    if (qtyNumber > selectedProduct.stock) {
      setErrorMsg(
        `สินค้าคงเหลือไม่พอ (คงเหลือ ${selectedProduct.stock} ${selectedProduct.unit})`
      );
      return;
    }

    setSubmitting(true);

    // 1. บันทึกรายการขายลงตาราง sales
    const { error: saleError } = await supabase.from('sales').insert([
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: qtyNumber,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      },
    ]);

    if (saleError) {
      setErrorMsg(saleError.message);
      setSubmitting(false);
      return;
    }

    // 2. อัปเดต stock สินค้าให้ลดลงตามจำนวนที่ขาย
    const newStock = selectedProduct.stock - qtyNumber;
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', selectedProduct.id);

    if (updateError) {
      setErrorMsg(updateError.message);
      setSubmitting(false);
      return;
    }

    // สำเร็จ: แจ้งเตือน รีเซ็ตฟอร์ม และโหลดสินค้าใหม่ (stock อัปเดต)
    setSuccessMsg(`ขายสำเร็จ: ${selectedProduct.name} จำนวน ${qtyNumber} ${selectedProduct.unit}`);
    resetForm();
    fetchProducts();
    setSubmitting(false);
  };

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {errorMsg && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>
      )}
      {successMsg && (
        <p style={{ color: 'green', fontWeight: 'bold' }}>{successMsg}</p>
      )}

      {loading ? (
        <p>กำลังโหลดข้อมูลสินค้า...</p>
      ) : (
        <form onSubmit={handleSell}>
          {/* Dropdown เลือกสินค้า */}
          <label>
            สินค้า
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              <option value="">-- เลือกสินค้า --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.price} บาท) - คงเหลือ {product.stock} {product.unit}
                </option>
              ))}
            </select>
          </label>

          {/* ช่องกรอกจำนวน */}
          <input
            type="number"
            placeholder="จำนวนที่จะขาย"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
          />

          {/* แสดงยอดรวมอัตโนมัติ */}
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
            ยอดรวม: {totalPrice.toFixed(2)} บาท
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'ขาย'}
          </button>
        </form>
      )}
    </div>
  );
}
