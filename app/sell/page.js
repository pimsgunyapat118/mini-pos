"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// เกณฑ์เตือนภัยสต๊อกใกล้หมด
const LOW_STOCK_THRESHOLD = 5;

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const qtyNumber = parseInt(quantity, 10) || 0;
  const totalPrice = selectedProduct ? selectedProduct.price * qtyNumber : 0;

  const resetForm = () => {
    setSelectedProductId('');
    setQuantity('');
  };

  // ===== ส่วนที่เพิ่ม: สร้างข้อความและส่งแจ้งเตือน Telegram =====
  // ห่อ try/catch ทั้งก้อน ถ้า Telegram ล่มก็ไม่กระทบการขาย
  const sendTelegramNotification = async ({ product, qty, total, newStock }) => {
    try {
      const timeText = new Date().toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // ข้อความที่ 1: แจ้งเตือน Order ใหม่
      const orderMessage =
        `🛍️ <b>มีรายการขายใหม่!</b>\n` +
        `- สินค้า: ${product.name}\n` +
        `- จำนวน: ${qty} ${product.unit || 'ชิ้น'}\n` +
        `- ราคารวม: ${Number(total).toFixed(2)} บาท\n` +
        `- สต๊อกคงเหลือปัจจุบัน: ${newStock} ${product.unit || 'ชิ้น'}\n` +
        `- เวลา: ${timeText}`;

      const messages = [orderMessage];

      // ข้อความที่ 2: แจ้งเตือนสต๊อกใกล้หมด (ส่งเฉพาะเมื่อเข้าเกณฑ์)
      if (newStock <= LOW_STOCK_THRESHOLD) {
        const lowStockMessage =
          `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n` +
          `- สินค้า: ${product.name}\n` +
          `- คงเหลือเพียง: ${newStock} ${product.unit || 'ชิ้น'}\n` +
          `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`;
        messages.push(lowStockMessage);
      }

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
    } catch (error) {
      // กลืน error ไว้ ไม่โยนต่อ เพื่อไม่ให้หน้าขายค้าง
      console.error('ส่งแจ้งเตือน Telegram ไม่สำเร็จ:', error);
    }
  };
  // ===== จบส่วนที่เพิ่ม =====

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

    // 2. อัปเดต stock ให้ลดลง
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

    // 3. ส่งแจ้งเตือน Telegram หลังตัดสต๊อกสำเร็จแล้วเท่านั้น
    //    ไม่ใส่ await เพื่อไม่ให้ผู้ใช้ต้องรอ และ error ถูกจัดการอยู่ในฟังก์ชันแล้ว
    sendTelegramNotification({
      product: selectedProduct,
      qty: qtyNumber,
      total: totalPrice,
      newStock,
    });

    // 4. แจ้งผลบนเว็บตามปกติ ไม่ขึ้นกับผลของ Telegram
    let message = `ขายสำเร็จ: ${selectedProduct.name} จำนวน ${qtyNumber} ${selectedProduct.unit}`;
    if (newStock <= LOW_STOCK_THRESHOLD) {
      message += ` ⚠️ สต๊อกเหลือ ${newStock} ${selectedProduct.unit} กรุณาเติมสต๊อก`;
    }
    setSuccessMsg(message);

    resetForm();
    fetchProducts();
    setSubmitting(false);
  };

  return (
    <div>
      <h1>ขายสินค้า</h1>

      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: 'green', fontWeight: 'bold' }}>{successMsg}</p>}

      {loading ? (
        <p>กำลังโหลดข้อมูลสินค้า...</p>
      ) : (
        <form onSubmit={handleSell}>
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

          <input
            type="number"
            placeholder="จำนวนที่จะขาย"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
          />

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
