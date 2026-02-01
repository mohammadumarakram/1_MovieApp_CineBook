import express from "express";
import cors from 'cors'
import "dotenv/config";
import connectDB from "./configs/db.js";
import { clerkMiddleware } from '@clerk/express'

import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRouter.js";
import userRouter from "./routes/userRoutes.js";
import { stripeWebhooks } from "./Controllers/stripeWebhooks.js";


const app=express();
const port=3000; 

//call connect db
await connectDB();

//stripe webhook
app.use('/api/stripe',express.raw({type:'application/json'}),stripeWebhooks); 



//middlewares.
app.use(express.json());
app.use(cors())
app.use(clerkMiddleware())




//home route
app.get("/",(req,res)=>{
    res.send("Backend is working");
})

//ingest route
app.use("/api/inngest", serve({ client: inngest, functions }));

//baseurl/api/show router paths

app.use("/api/show",showRouter);


app.use("/api/bookings",bookingRouter);
app.use("/api/admin",adminRouter);
app.use("/api/user",userRouter);






app.listen(port,()=>{
    console.log(`Server running at http://localhost:${port}`);
    
});



