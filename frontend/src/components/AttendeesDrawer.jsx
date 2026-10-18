
// import React from 'react';

// export default function AttendeesDrawer({
//   open,
//   eventName,
//   seatsInfo,
//   attendees = [],
//   loading = false,
//   error = '',
//   onClose,
// }) {
//   if (!open) return null;

//   return (
//     <div className="drawer-overlay-wrap">
//       <div className="bg-dimmed" onClick={onClose} />

//       <aside className="drawer" role="dialog" aria-modal="true">
//         <div className="drawer-head">
//           <div>
//             <div className="eyebrow">รายชื่อผู้ลงทะเบียน</div>
//             <h2 className="drawer-title">{eventName}</h2>
//             <p className="hint" style={{ marginTop: 2 }}>
//               ลงทะเบียนแล้ว {seatsInfo} คน
//             </p>
//           </div>

//           <button
//             type="button"
//             className="close-btn"
//             onClick={onClose}
//             title="ปิด"
//           >
//             ✕
//           </button>
//         </div>

//         <div className="drawer-body">
//           {loading ? (
//             <p style={{ padding: 24, textAlign: 'center' }}>
//               กำลังโหลดรายชื่อผู้ลงทะเบียน...
//             </p>
//           ) : error ? (
//             <p
//               role="alert"
//               style={{ padding: 24, textAlign: 'center', color: '#c0392b' }}
//             >
//               โหลดรายชื่อไม่สำเร็จ: {error}
//             </p>
//           ) : (
//             <table className="drawer-table">
//               <thead>
//                 <tr>
//                   <th>ชื่อ</th>
//                   <th>อีเมล</th>
//                   <th style={{ textAlign: 'right' }}>
//                     เวลาลงทะเบียน
//                   </th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {attendees.map((attendee, index) => (
//                   <tr
//                     key={
//                       attendee.id ??
//                       attendee.registrationId ??
//                       `${attendee.email}-${index}`
//                     }
//                   >
//                     <td>
//                       <div className="user-cell">
//                         <div className="avatar">
//                           {(attendee.name || '?').charAt(0)}
//                         </div>
//                         <span className="user-name">
//                           {attendee.name || 'ไม่ระบุชื่อ'}
//                         </span>
//                       </div>
//                     </td>

//                     <td>
//                       <span className="user-email">
//                         {attendee.email || '-'}
//                       </span>
//                     </td>

//                     <td
//                       className="time-cell"
//                       style={{ textAlign: 'right' }}
//                     >
//                       {attendee.registeredAt
//                         ? new Date(attendee.registeredAt).toLocaleString(
//                             'th-TH'
//                           )
//                         : '-'}
//                     </td>
//                   </tr>
//                 ))}

//                 {attendees.length === 0 && (
//                   <tr>
//                     <td
//                       colSpan={3}
//                       style={{
//                         color: 'var(--muted)',
//                         padding: '24px 8px',
//                         textAlign: 'center',
//                       }}
//                     >
//                       ยังไม่มีผู้ลงทะเบียน
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           )}
//         </div>
//       </aside>
//     </div>
//   );
// }
