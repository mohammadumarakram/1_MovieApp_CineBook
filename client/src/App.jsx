import { Route, Routes, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./Pages/Home"
import Movies from "./Pages/Movies"
import MovieDetails from "./Pages/MovieDetails"
import SeatLayout from "./Pages/SeatLayout"
import MyBookings from "./Pages/MyBookings"
import Favourite from "./Pages/Favourite"
import {Toaster} from 'react-hot-toast'
import Footer from "./components/Footer"
 
const App = () => {

  const isAdminRoute=useLocation().pathname.startsWith('/admin');
 
  return (
    <>

    <Toaster/>

    {/* main routing navbar and footer are default on each route */}
    {!isAdminRoute && <Navbar/>} 
    
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/movies" element={<Movies/>} />
      <Route path="/movies/:id" element={<MovieDetails/>} />
      <Route path="/movies/:id/:date" element={<SeatLayout/>} />
      <Route path="/my-bookings" element={<MyBookings/>} />
      <Route path="/favourite" element={<Favourite/>} />


    

    </Routes>


      {!isAdminRoute && <Footer/>} 
    
    
    
    
    
    
    </>
  )
}
 
export default App
