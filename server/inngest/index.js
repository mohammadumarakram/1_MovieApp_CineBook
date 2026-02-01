import { Inngest } from "inngest";
import User from "../models/User.js";
import connectDB from "../configs/db.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });


//1) ingest function to create user in db

// Your new function:
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {

     await connectDB();



    const {id,first_name,last_name,email_addresses,image_url}=event.data

    const userData={
      _id:id,
        
        email:email_addresses[0].email_address,
        name: first_name + ' ' + last_name,
        image:image_url
    }

    await User.create(userData);

   
  },
);


//2) ingest function to delete user in db

// Your new function:
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {

    await connectDB();



   const {id}=event.data;

   await User.findByIdAndDelete(id);


   
  },
);


//3) ingest function to update user in db

// Your new function:
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {

    await connectDB();
    

     const {id,first_name,last_name,email_addresses,image_url}=event.data;

     const userData={
        _id:id,
        email:email_addresses[0].email_address,
        name: first_name + ' ' + last_name,
        image:image_url
    }

    await User.findByIdAndUpdate(id,userData);





   


   
  },
);


//4) ingest function cancel booking and release seats of show after 10 minutes of booking created if payment not made

// const releaseSeatsAndReleaseBooking=inngest.createFunction(
//     {id:"release-seats-delete-booking"},
//     {event:"app/checkpayment"},
//     async({event,step})=>{
//         await connectDB();
//         const tenMinutesLater=new Date(Date.now()+10*60*1000);
//         await step.sleepUntil("waitfor-10-minutes",tenMinutesLater);

//         await step.run('check-payment-status',async()=>{
//         const {bookingId}=event.data.bookingId;
//         const booking=await Booking.findById(bookingId);
//         //if payment is not made releae seats and delete booking
//         if(!booking.isPaid){
//              const show=await Show.findById(booking.show);


//              booking.bookedSeats.forEach((seat)=>{
//                 delete show.occupiedSeats[seat]
//              });

//              show.markModified("occupiedSeats");
//              await show.save();
//              await Booking.findByIdAndDelete(booking._id);
//         }
        
//     }
// );  

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },

  async ({ event, step }) => {
    await connectDB();

    // ⏳ Wait for 10 minutes before checking payment
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    return await step.run("check-payment-status", async () => {
      // ✅ Correct destructuring
      const { bookingId } = event.data;

      const booking = await Booking.findById(bookingId);

      // 🚨 Booking might already be deleted or invalid
      if (!booking) {
        return { status: "booking-not-found" };
      }

      // ✅ If payment is completed, do nothing
      if (booking.isPaid) {
        return { status: "payment-completed" };
      }

      // 🎟️ Payment not done → release seats
      const show = await Show.findById(booking.show);

      if (!show) {
        return { status: "show-not-found" };
      }

      // Ensure occupiedSeats exists
      if (!show.occupiedSeats) {
        show.occupiedSeats = {};
      }

      // 🪑 Release booked seats
      booking.bookedSeats.forEach((seat) => {
        delete show.occupiedSeats[seat];
      });

      // 🔥 Important for MongoDB to detect nested changes
      show.markModified("occupiedSeats");
      await show.save();

      // 🗑️ Delete unpaid booking
      await Booking.findByIdAndDelete(booking._id);

      return { status: "booking-cancelled-and-seats-released" };
    });
  }
);

//5) inngest function to send email when user books a show

const sendBookingConfirmationEmail=inngest.createFunction(
    {id:"send-booking-confirmation-email"},
    {event:"app/show.booked"},
    async({event,step})=>{
        await connectDB();
        const {bookingId}=event.data;
        const booking=await Booking.findById(bookingId).populate({
            path:"show",
            populate:{
                path:"movie",
                model:"Movie",
            },
        }).populate('user');

        await sendEmail({
          to:booking.user.email,
          subject:`Payment confirmation : ${booking.show.movie.title} booked!`,
         body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Hi ${booking.user.name},</h2>
    <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
    <p>
        <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}<br/>
        <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}
    </p>
    <p>Enjoy the show! 🍿</p>
    <p>Thanks for booking with us!<br/>- CineBook Team</p>
</div>`
        })
        




        
        
    }
);











// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,



];

