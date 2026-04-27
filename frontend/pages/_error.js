// _error.js — Global error page สำหรับ Next.js
// แสดง error ที่ user-friendly และไม่รั่ว stack trace ใน production

export default function ErrorPage({ statusCode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-500 mb-4">{statusCode || '?'}</h1>
        <p className="text-xl font-semibold mb-2">
          {statusCode === 404 ? 'ไม่พบหน้าที่ต้องการ' : 'เกิดข้อผิดพลาด'}
        </p>
        <p className="text-gray-400 mb-6">
          {statusCode === 404
            ? 'หน้าที่คุณกำลังมองหาไม่มีอยู่'
            : 'กรุณาลองใหม่อีกครั้ง'}
        </p>
        <a href="/dashboard" className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition">
          กลับหน้าหลัก
        </a>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
