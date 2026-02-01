import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets, dummyDateTimeData, dummyShowsData } from "../assets/assets";
import Loading from "../components/Loading";
import {
  ArrowRightIcon,
  ClockIcon,
  Heart,
  PlayCircleIcon,
  StarIcon,
} from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/appContext";

const SeatLayout = () => {

     const {
      shows,
      axios,
      getToken,
      user,
      
      image_base_url,
    } = useAppContext();


  const { id, date } = useParams();

  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const navigate = useNavigate();

  const [occupiedSeats, setoccupiedSeats] = useState([])

  const [selectedSeats, setSelectedSeats] = useState([]);

  //gets selected when clicing a time
  const [selectedTime, setSelectedTime] = useState(null);
  //set it using route id
  const [show, setShow] = useState(null);

  const getShow = async () => {
   try {

    const {data}=await axios.get(`/api/show/${id}`)
    if(data.success){
      setShow(data);
    }
   } catch (error) {
    console.error(error);

    
   }
  }; 


  const getoccupiedseats=async()=>{
    try {

      const {data}=await axios.get(`/api/bookings/seats/${selectedTime.showId}`)

      if(data.success){
        setoccupiedSeats(data.occupiedSeats);
        console.log(data.occupiedSeats);
        
      }

      else{
        toast.error(data.message);
      }
      
    } catch (error) {
       console.error(error);
      
    }
  }
  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast("Please select time first");
    }


    if(occupiedSeats.includes(seatId)){
      return toast("This seat is already booked")
    }
    if (!selectedSeats.includes(seatId) && selectedSeats.length > 4) {
      return toast("You can only select 5 seats");
    }
    // if previously existed remove it if not add it

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId],
    );
  };





  const bookTickets=async()=>{

    try {
      if(!user){
        return toast.error("Please login first");
      }

      if(!selectedTime || !selectedSeats.length){
        return toast.error("Please select time and seats first");
      }

      const {data}=await axios.post(`/api/bookings/create`,{showId:selectedTime.showId,selectedSeats}, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      }   )

      if(data.success){
       window.location.href=data.url;
      }

      else{
        toast.error(data.message);
      }
      
    } catch (error) {
      console.log(error.message);
      
      
    }

  }

  //its a component can even place in a separate file returns a single div
  const renderSeats = (row, count = 7) => {return (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2 ">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              //you can pass a variable inside return inside a handler function so each button is like handleSeatselect(A1) or A2 like this hardcoded values not variable arguement
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer ${selectedSeats.includes(seatId) && "bg-primary text-white"} ${occupiedSeats.includes(seatId) && "opacity-50"}   `}
            >
              {seatId}
            </button>

          



          );
        })}
      </div>
    </div>
 ) };

  useEffect(() => {
    getShow();
  }, []);

  useEffect(() => {
    if(selectedTime){
      getoccupiedseats();
    }
    
  }, [selectedTime]);



  return show ? (
    <div
      className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30
md:pt-50"
    >
      {/* 1)  Available Timings */}

      <div
        className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10
h-max md:sticky md:top-30"
      >
        <p className="text-lg font-semibold px-6">Available Timings</p>
        <div className="mt-5 space-y-1">
          {show.dateTime[date].map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md
      cursor-pointer transition ${
        selectedTime?.time === item.time
          ? "bg-primary text-white"
          : "hover:bg-primary/20"
      }`}
            >
              <ClockIcon className="w-4 h-4" />

              <p className="text-sm">{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2) Seats Layout */}

      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>

          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>{group.map((row) => renderSeats(row))}</div>
            ))}
          </div>
        </div>

        {/* 3) proceed button  */}

        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
