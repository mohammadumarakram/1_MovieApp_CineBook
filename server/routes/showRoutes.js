import express from "express";
import { addShow, getNowPlayingMovies, getShow, getShows } from "../Controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter=express.Router();

//2) all movies
showRouter.get("/now-playing",getNowPlayingMovies);

//2)to add a show with a time
// showRouter.post("/add",protectAdmin,addShow);
showRouter.post("/add",addShow);

//3)all movies which has shows
showRouter.get("/all",getShows);

//4) all shows of a movie
showRouter.get("/:movieId",getShow);


export default showRouter;


