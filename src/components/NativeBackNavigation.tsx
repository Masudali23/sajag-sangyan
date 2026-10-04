import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { consumeNativeBack, nativeBackEvent } from "../lib/native-back";

export default function NativeBackNavigation() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const handleBack = (event: Event) =>
      consumeNativeBack(event, pathname, () =>
        navigate("/", { replace: true }),
      );
    window.addEventListener(nativeBackEvent, handleBack);
    return () => window.removeEventListener(nativeBackEvent, handleBack);
  }, [pathname, navigate]);
  return null;
}
