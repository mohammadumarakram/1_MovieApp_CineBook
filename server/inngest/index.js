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



//6) inngest function to send reminder

// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" }, // Every 8 hours
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    // Prepare reminder tasks
    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8Hours },
      }).populate('movie');

      const tasks = [];

      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;

        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if (userIds.length === 0) continue;

        const users = await User.find({ _id: { $in: userIds } }).select("name email");

        for (const user of users) {
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          })
        }
      }
      return tasks;
    })

    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send." }
    }

    // Send reminder emails
    const results = await step.run('send-all-reminders', async () => {
      return await Promise.allSettled(
        reminderTasks.map(task => sendEmail({
          to: task.userEmail,
          subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
          body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hello ${task.userName},</h2>
            <p>This is a quick reminder that your movie:</p>
            <h3 style="color: #F84565;">${task.movieTitle}</h3>
            <p>
              is scheduled for <strong>${new Date(task.showTime).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}</strong> at 
              <strong>${new Date(task.showTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}</strong>.
            </p>
            <p>It starts in approximately <strong>8 hours</strong> - make sure you're ready!</p>
            <br/>
            <p>Enjoy the show!<br/>QuickShow Team</p>
          </div>`
        }))
      )
    })

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed.`
    }
  }
)















// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
    sendShowReminders,



];

