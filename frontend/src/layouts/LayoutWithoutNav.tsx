// frontend/src/layouts/LayoutWithoutNav.tsx
import { Outlet } from "react-router-dom";

export default function LayoutWithoutNav() {
  return (
    <>
      <Outlet />
    </>
  );
}
