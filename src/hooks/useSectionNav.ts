import { useLocation, useNavigate } from "react-router-dom";

export function useSectionNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (id: string) => {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  };
}
