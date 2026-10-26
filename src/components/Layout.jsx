import Menu from "./Menu";
import Logo from "./Logo";
import PageTransition from "./PageTransition";
import CustomCursor from "./CustomCursor";
import HieroglyphBorders from "./HieroglyphBorders";

export default function Layout() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden text-offwhite">
      <HieroglyphBorders />
      <CustomCursor />
      <Logo />
      <Menu />
      <div className="relative z-10">
        <PageTransition />
      </div>
    </div>
  );
}