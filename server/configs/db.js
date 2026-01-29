import mongoose from "mongoose"

const connectDB=async ()=>{

    try {


         await mongoose.connect(`${process.env.MONGODB_URI}/CineBook`);
         console.log("MongoDB connected successfully ✅");



         



        
    } 
    
    catch (error) {
        console.log(error.message);
        
        
    }

   



}

export default connectDB;
 