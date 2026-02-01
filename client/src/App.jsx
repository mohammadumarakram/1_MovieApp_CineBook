import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./Pages/Home";
import Movies from "./Pages/Movies";
import MovieDetails from "./Pages/MovieDetails";
import SeatLayout from "./Pages/SeatLayout";
import MyBookings from "./Pages/MyBookings";
import Favourite from "./Pages/Favourite";
import { Toaster } from "react-hot-toast";
import Footer from "./components/Footer";
import Layout from "./Pages/admin/Layout";
import Dashboard from "./Pages/admin/Dashboard";
import AddShow from "./Pages/admin/AddShow";
import ListBookings from "./Pages/admin/ListBookings";
import ListShow from "./Pages/admin/ListShow";
import { useAppContext } from "./context/appContext";
import { SignIn } from "@clerk/clerk-react";
import Loading from "./components/Loading";

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith("/admin");

  const {user}=useAppContext();


  return (
    <>
      <Toaster />

      {/* main routing navbar and footer are default on each route */}
      {!isAdminRoute && <Navbar />}
 
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/movies/:id/:date" element={<SeatLayout />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="loading/:nextUrl" element={<Loading />} />
        <Route path="/favourite" element={<Favourite />} />

        <Route path="/admin/*" element={user?<Layout />:(

          <div className="min-h-screen flex justify-center items-center">
            <SignIn fallbackRedirectUrl={'/admin'}/>
          </div>
        )}>
          {/* // in route /admin default is dashboard along with layout in rest its just layout and the defined ones */}
          <Route index element={<Dashboard />} />
          <Route path="add-shows" element={<AddShow />} />
          <Route path="list-bookings" element={<ListBookings />} />
          <Route path="list-shows" element={<ListShow />} />
        </Route>
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;
