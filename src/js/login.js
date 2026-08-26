document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช

      // ดึงข้อมูลจาก Input (เตรียมส่งให้ Backend ในอนาคต)
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // จำลองการล็อกอินสำเร็จ
      console.log("กำลังเข้าสู่ระบบด้วย:", email);

      // (สำหรับ Backend: เซฟ Token ลง localStorage หรือ Session ตรงนี้)
      // localStorage.setItem("isLoggedIn", "true"); 

      alert("เข้าสู่ระบบสำเร็จ!");
      
      // พากลับไปที่หน้าแรก
      window.location.href = "UpcomingEventsPage.html";
    });
  }
});
