import { Outlet } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import { RoomsProvider } from "./context/RoomsContext.jsx";

export default function App() {
  return (
    <RoomsProvider>
      <div className="app-shell">
        <Header />
        <div className="app-main-content">
          <Outlet />
        </div>
        <Footer />
      </div>
    </RoomsProvider>
  );
}
