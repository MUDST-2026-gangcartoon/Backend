import React, { useEffect, useMemo, useState } from 'react';
import './PaymentHistoryPage.css';
import { mockPaymentService } from '../../api/mockPaymentService';
import Navbar from '../../components/Navbar';

const STATUS_CONFIG = {
  SUCCESS: { label: 'ชำระเงินสำเร็จ', className: 'success' },
  CONFIRMED: { label: 'ชำระเงินสำเร็จ', className: 'success' },
  PENDING: { label: 'รอชำระเงิน', className: 'pending' },
  PENDING_PAYMENT: { label: 'รอชำระเงิน', className: 'pending' },
  EXPIRED: { label: 'หมดอายุ', className: 'expired' },
  CANCELLED: { label: 'ยกเลิก', className: 'cancelled' },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (dateString) => {
  if (!dateString) return '-';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await mockPaymentService.getHistory();
        const data = Array.isArray(response) ? response : [];

        if (!active) return;

        setPayments(
        data.map((item) => ({
            id: String(item.paymentId),
            paymentId: item.paymentId,
            eventId: item.eventId,
            eventName: item.eventTitle,
            ticketType: item.ticketTypeName,
            quantity: item.quantity,
            amount: item.totalAmount,
            paymentDate: item.createdAt,
            expiresAt: item.expiresAt,
            method: 'Mock Payment',
            status: item.status,
        }))
        );
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              'โหลดประวัติการชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPayments();

    return () => {
      active = false;
    };
  }, []);


  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesStatus =
        filter === 'ALL' ||
        payment.status === filter ||
        (filter === 'SUCCESS' && payment.status === 'CONFIRMED') ||
        (filter === 'PENDING' && payment.status === 'PENDING_PAYMENT');

      const matchesSearch =
        !keyword ||
        (payment.eventName || '').toLowerCase().includes(keyword) ||
        String(payment.paymentId ?? payment.id)
          .toLowerCase()
          .includes(keyword) ||
        (payment.ticketType || '').toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [payments, filter, search]);

  const successfulTotal = payments
    .filter(
      (payment) =>
        payment.status === 'SUCCESS' || payment.status === 'CONFIRMED',
    )
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <>
      <Navbar />

      <main className="payment-history-page">
        <section className="payment-history-header">
          <div>
            <p className="payment-history-eyebrow">MY ACCOUNT</p>
            <h1>ประวัติการชำระเงิน</h1>
            <p className="payment-history-description">
              ตรวจสอบรายการชำระเงินและสถานะธุรกรรมของคุณได้ที่นี่
            </p>
          </div>

          <div className="payment-history-total">
            <span>ยอดชำระสำเร็จทั้งหมด</span>
            <strong>{formatCurrency(successfulTotal)}</strong>
            <small>คำนวณจากรายการที่ชำระสำเร็จ</small>
          </div>
        </section>

        <section
          className="payment-history-toolbar"
          aria-label="ค้นหาและกรองรายการ"
        >
          <div className="payment-history-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่องาน เลขธุรกรรม หรือประเภทบัตร"
              aria-label="ค้นหารายการชำระเงิน"
            />
          </div>

          <label className="payment-history-filter-label">
            <span>สถานะ</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="กรองตามสถานะการชำระเงิน"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="SUCCESS">ชำระเงินสำเร็จ</option>
              <option value="PENDING">รอชำระเงิน</option>
              <option value="EXPIRED">หมดอายุ</option>
              <option value="CANCELLED">ยกเลิก</option>
            </select>
          </label>
        </section>

        {loading ? (
          <section className="payment-history-empty">
            <p>กำลังโหลดประวัติการชำระเงิน...</p>
          </section>
        ) : error ? (
          <section className="payment-history-empty">
            <h2>เกิดข้อผิดพลาด</h2>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              โหลดหน้าใหม่
            </button>
          </section>
        ) : (
          <>
            <div className="payment-history-results">
              {filteredPayments.length > 0
                ? `พบ ${filteredPayments.length} รายการ`
                : 'ไม่พบรายการที่ตรงกับการค้นหา'}
            </div>

            {filteredPayments.length === 0 ? (
              <section className="payment-history-empty">
                <div
                  className="payment-history-empty-icon"
                  aria-hidden="true"
                >
                  ฿
                </div>
                <h2>ไม่พบประวัติการชำระเงิน</h2>
                <p>ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะของคุณ</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilter('ALL');
                  }}
                >
                  ล้างตัวกรอง
                </button>
              </section>
            ) : (
              <section
                className="payment-history-list"
                aria-label="รายการชำระเงิน"
              >
                {filteredPayments.map((payment) => {
                  const status =
                    STATUS_CONFIG[payment.status] || {
                      label: payment.status || 'ไม่ทราบสถานะ',
                      className: 'pending',
                    };

                  return (
                    <article
                      className="payment-history-card"
                      key={payment.id}
                    >
                      <div className="payment-history-card-top">
                        <div
                          className="payment-history-event-icon"
                          aria-hidden="true"
                        >
                          <span>▦</span>
                        </div>

                        <div className="payment-history-event">
                          <h2>{payment.eventName}</h2>
                          <p>เลขธุรกรรม: {payment.id}</p>
                        </div>

                        <span
                          className={`payment-history-status ${status.className}`}
                        >
                          <span className="payment-history-status-dot" />
                          {status.label}
                        </span>
                      </div>

                      <div className="payment-history-details">
                        <div>
                          <span className="payment-history-detail-label">
                            ประเภทบัตร
                          </span>
                          <strong>{payment.ticketType}</strong>
                        </div>
                        <div>
                          <span className="payment-history-detail-label">
                            จำนวน
                          </span>
                          <strong>{payment.quantity} ใบ</strong>
                        </div>
                        <div>
                          <span className="payment-history-detail-label">
                            ช่องทางชำระเงิน
                          </span>
                          <strong>{payment.method}</strong>
                        </div>
                        <div>
                          <span className="payment-history-detail-label">
                            วันที่ทำรายการ
                          </span>
                          <strong>{formatDate(payment.paymentDate)}</strong>
                        </div>
                      </div>

                      <div className="payment-history-card-bottom">
                        <span>ยอดรวม</span>
                        <strong>{formatCurrency(payment.amount)}</strong>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}