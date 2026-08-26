document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช

      // ดึงข้อมูลจากฟอร์ม
      const displayName = document.getElementById("display-name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      // เช็คว่ารหัสผ่านตรงกันหรือไม่
      if (password !== confirmPassword) {
        alert("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
        return; // หยุดการทำงาน
      }

      // จำลองการสมัครสมาชิกสำเร็จ
      console.log("สร้างบัญชีใหม่:", {
        name: displayName,
        email: email
      });

      alert("สร้างบัญชีสำเร็จ! กรุณาเข้าสู่ระบบ");
      
      // พาไปหน้า Login
      window.location.href = "LoginPage.html";
    });
  }
});