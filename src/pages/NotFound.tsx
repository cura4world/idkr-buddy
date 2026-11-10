import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

// 없는 주소로 들어왔을 때. 홈 링크는 react-router 의 Link 로 둡니다 —
// <a href="/"> 는 basename("/idkr-buddy")을 건너뛰어 웹·스토어 앱 모두에서 다시 빈 화면이 됩니다.
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 font-gothic text-base text-muted-foreground">페이지를 찾을 수 없습니다</p>
        <Link to="/" replace className="font-gothic text-[#2C6D63] underline underline-offset-2">
          홈으로
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
